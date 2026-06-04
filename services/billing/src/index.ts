import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import client from 'prom-client';
import { pool } from './db.js';
import { connectKafka, emitEvent } from './kafka.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5008;

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics monitoring collection
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'billing_http_request_duration_seconds',
  help: 'Duration of Billing HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5]
});
register.registerMetric(httpRequestDurationMicroseconds);

app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    if (req.route) {
      end({ method: req.method, route: req.route.path, code: res.statusCode });
    }
  });
  next();
});

// Helper: Map plans to prices
const PLAN_PRICES: { [key: string]: number } = {
  'Mobile': 2.99,
  'Basic': 7.99,
  'Standard': 12.99,
  'Premium': 17.99
};

// POST: Create or Update Subscription
app.post('/api/billing/subscribe', async (req: Request, res: Response) => {
  const { userId, planName } = req.body;
  if (!userId || !planName) {
    return res.status(400).json({ error: 'userId and planName are required' });
  }

  const price = PLAN_PRICES[planName];
  if (price === undefined) {
    return res.status(400).json({ error: 'Invalid subscription plan name' });
  }

  try {
    // 1. Calculate dates
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days trial/period

    // 2. Insert subscription
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, plan_name, status, price, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, plan_name, status, price, current_period_end`,
      [userId, planName, 'ACTIVE', price, currentPeriodStart, currentPeriodEnd]
    );
    const sub = result.rows[0];

    // 3. Emit Kafka event
    await emitEvent('subscription_created', {
      subscriptionId: sub.id,
      userId,
      planName,
      price,
      currentPeriodEnd: sub.current_period_end
    });

    return res.status(201).json(sub);
  } catch (err) {
    console.error('Subscription creation failed:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Record Payment (Stripe Mock Webhook / Direct charge)
app.post('/api/billing/pay', async (req: Request, res: Response) => {
  const { userId, subscriptionId, amount, paymentMethod } = req.body;
  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount are required' });
  }

  const transactionId = `txn-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  try {
    const result = await pool.query(
      `INSERT INTO payments (user_id, subscription_id, amount, status, payment_method, transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, transaction_id, amount, status, created_at`,
      [userId, subscriptionId || null, amount, 'SUCCESS', paymentMethod || 'credit_card', transactionId]
    );
    const payment = result.rows[0];

    // Emit Kafka event
    await emitEvent('payment_successful', {
      paymentId: payment.id,
      userId,
      amount,
      transactionId,
      timestamp: payment.created_at
    });

    return res.status(201).json(payment);
  } catch (err) {
    console.error('Payment logging failed:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: Retrieve user payments & subscriptions history
app.get('/api/billing/history', async (req: Request, res: Response) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const subs = await pool.query(
      'SELECT id, plan_name, status, price, current_period_end, created_at FROM subscriptions WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );

    const payments = await pool.query(
      'SELECT id, amount, status, payment_method, transaction_id, created_at FROM payments WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );

    return res.json({
      subscriptions: subs.rows,
      payments: payments.rows
    });
  } catch (err) {
    console.error('Failed to get billing history:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// GET: Kubernetes Health Probe
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', service: 'billing-service', db: 'CONNECTED' });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', db: 'DISCONNECTED', error: err });
  }
});

const startServer = async () => {
  let dbConnected = false;
  let retries = 5;

  while (!dbConnected && retries > 0) {
    try {
      await pool.query('SELECT 1');
      dbConnected = true;
    } catch (err) {
      retries -= 1;
      console.warn(`[Billing Service] PostgreSQL connection failed. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  await connectKafka();

  app.listen(port, () => {
    console.log(`Billing Microservice listening at http://localhost:${port}`);
  });
};

startServer();
