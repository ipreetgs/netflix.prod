import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import client from 'prom-client';
import { pool } from './db.js';
import { connectRedis, setCache, getCache, deleteCache } from './redis.js';
import { connectKafka, emitEvent } from './kafka.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnetflixkey123!';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'superrefreshsecretnetflixkey456!';

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics monitoring collection
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'Duration of Auth HTTP requests in seconds',
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

// Helper: Token Generator
const generateTokens = (userId: number, email: string, role: string) => {
  const accessToken = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// POST: Registration
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, 'USER']
    );
    const user = result.rows[0];

    // Seed default profiles for this user
    const defaultProfiles = [
      { name: 'Gurpreet', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
      { name: 'Kids', avatar: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?w=150&auto=format&fit=crop&q=80' },
      { name: 'Family', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' }
    ];

    for (const p of defaultProfiles) {
      await pool.query(
        'INSERT INTO profiles (user_id, name, avatar_url) VALUES ($1, $2, $3)',
        [user.id, p.name, p.avatar]
      );
    }

    // Stream user_registered Event via Kafka
    await emitEvent('user_registered', { userId: user.id, email: user.email, timestamp: new Date() });

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    // Save refresh token session in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    return res.status(201).json({ accessToken, refreshToken, email: user.email, role: user.role });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password, mfaCode } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Handle MFA Check
    if (user.mfa_enabled) {
      if (!mfaCode) {
        return res.status(200).json({ mfaRequired: true, userId: user.id, message: 'MFA Code required' });
      }
      // Stub MFA verification (would use otplib/speakeasy against user.mfa_secret)
      if (mfaCode !== '123456' && mfaCode !== '000000') {
        return res.status(401).json({ error: 'Invalid MFA verification code' });
      }
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    // Log refresh session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    // Log Device
    const ip = req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';
    await pool.query(
      `INSERT INTO devices (user_id, device_name, device_type, ip_address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [user.id, userAgent, 'web', ip]
    );

    return res.json({ accessToken, refreshToken, email: user.email, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Token Refresh
app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    // Check database session
    const result = await pool.query('SELECT * FROM sessions WHERE refresh_token = $1', [refreshToken]);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Session expired or invalid' });
    }

    const session = result.rows[0];
    if (new Date() > new Date(session.expires_at)) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [session.id]);
      return res.status(403).json({ error: 'Session expired' });
    }

    jwt.verify(refreshToken, REFRESH_SECRET, async (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      const userResult = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId]);
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: 'User no longer exists' });
      }

      const user = userResult.rows[0];
      const tokens = generateTokens(user.id, user.email, user.role);

      return res.json({ accessToken: tokens.accessToken });
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Logout
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: MFA Setup Mock
app.post('/api/auth/mfa/setup', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const mockMfaSecret = `mfa-secret-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
    
    await pool.query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [mockMfaSecret, decoded.userId]);

    return res.json({
      secret: mockMfaSecret,
      qrCodeUrl: `otpauth://totp/NetflixClone:${decoded.email}?secret=${mockMfaSecret}&issuer=NetflixClone`
    });
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
});

// POST: MFA Enable
app.post('/api/auth/mfa/enable', async (req: Request, res: Response) => {
  const { code } = req.body;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (code === '123456' || code === '000000') {
      await pool.query('UPDATE users SET mfa_enabled = TRUE WHERE id = $1', [decoded.userId]);
      return res.json({ success: true, message: 'MFA enabled successfully' });
    }
    return res.status(400).json({ error: 'Invalid verification code' });
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
});

// POST: Password Reset Request
app.post('/api/auth/password-reset/request', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length === 0) {
      return res.status(200).json({ message: 'If the email exists, a reset link has been dispatched' });
    }

    const resetToken = Math.random().toString(36).substr(2, 15);
    const cacheKey = `reset:${resetToken}`;
    
    // Store in Redis with 15 minutes TTL
    await setCache(cacheKey, email, 900);

    // Emit event for Notification service to dispatch email
    await emitEvent('password_reset_requested', { email, token: resetToken });

    return res.json({ message: 'Reset token dispatched', token: resetToken });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Password Reset Confirm
app.post('/api/auth/password-reset/confirm', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

  try {
    const cacheKey = `reset:${token}`;
    const email = await getCache(cacheKey);
    if (!email) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [newHashedPassword, email]);
    await deleteCache(cacheKey);

    return res.json({ success: true, message: 'Password has been updated' });
  } catch (err) {
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
    res.json({ status: 'UP', service: 'auth-service', db: 'CONNECTED' });
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
      console.warn(`[Auth Service] PostgreSQL connection failed. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  await connectRedis();
  await connectKafka();

  app.listen(port, () => {
    console.log(`Auth Microservice listening at http://localhost:${port}`);
  });
};

startServer();
