import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import client from 'prom-client';
import { Kafka } from 'kafkajs';
import { pool } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5009;
const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics monitoring collection
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'notification_http_request_duration_seconds',
  help: 'Duration of Notification HTTP requests in seconds',
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

// In-memory logs buffer for fallback tracking
interface NotificationLog {
  id: string;
  type: string;
  recipient: string;
  content: string;
  timestamp: string;
}
const notificationLogs: NotificationLog[] = [];

const logNotification = (type: string, recipient: string, content: string) => {
  const logItem = {
    id: `notif-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    type,
    recipient,
    content,
    timestamp: new Date().toISOString()
  };
  notificationLogs.unshift(logItem);
  if (notificationLogs.length > 100) notificationLogs.pop(); // keep last 100
  console.log(`[Notification Sent] Type: ${type} | Recipient: ${recipient} | Content: "${content}"`);
};

// GET: Retrieve Notification Logs (for Admin Dashboard UI)
app.get('/api/notifications/logs', (req: Request, res: Response) => {
  return res.json(notificationLogs);
});

// POST: Direct Mock Endpoint (so services can trigger notifications without Kafka if running standalone)
app.post('/api/notifications/send', (req: Request, res: Response) => {
  const { type, recipient, content } = req.body;
  if (!type || !recipient || !content) {
    return res.status(400).json({ error: 'type, recipient and content are required' });
  }
  logNotification(type, recipient, content);
  return res.json({ success: true, message: 'Notification dispatched' });
});

// GET: Prometheus Metrics
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// GET: Health Probe
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'notification-service', kafkaBrokers });
});

// Kafka Consumer Loop
const startKafkaConsumer = async () => {
  try {
    const kafka = new Kafka({
      clientId: 'netflix-notification-service',
      brokers: kafkaBrokers.split(','),
    });

    const consumer = kafka.consumer({ groupId: 'notification-group' });
    await consumer.connect();
    
    // Subscribe to topics
    await consumer.subscribe({ topic: 'user_registered', fromBeginning: false });
    await consumer.subscribe({ topic: 'subscription_created', fromBeginning: false });
    await consumer.subscribe({ topic: 'payment_successful', fromBeginning: false });
    await consumer.subscribe({ topic: 'password_reset_requested', fromBeginning: false });

    console.log('[Kafka Consumer] Subscribed to user/billing events topics.');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const payload = JSON.parse(message.value?.toString() || '{}');
        const data = payload.data;

        if (topic === 'user_registered') {
          logNotification(
            'Welcome Email',
            data.email,
            `Welcome to Netflix Clone! Your account (ID: ${data.userId}) has been successfully created. Ready to stream?`
          );
        } else if (topic === 'subscription_created') {
          logNotification(
            'Subscription Started',
            `User ID: ${data.userId}`,
            `Subscription plan "${data.planName}" is now active. Price: $${data.price}/month. Next billing date: ${new Date(data.currentPeriodEnd).toLocaleDateString()}.`
          );
        } else if (topic === 'payment_successful') {
          logNotification(
            'Payment Receipt',
            `User ID: ${data.userId}`,
            `Your payment of $${data.amount} was processed successfully. Transaction ID: ${data.transactionId}. Thank you!`
          );
        } else if (topic === 'password_reset_requested') {
          logNotification(
            'Password Reset Pin',
            data.email,
            `A request to reset your password was received. Your verification token is: ${data.token}. Expires in 15 minutes.`
          );
        }
      },
    });
  } catch (err) {
    console.warn('[Kafka Consumer] Connection failed. Running in standalone REST webhook fallback mode.');
  }
};

app.listen(port, () => {
  console.log(`Notification Microservice listening at http://localhost:${port}`);
  startKafkaConsumer();
});
