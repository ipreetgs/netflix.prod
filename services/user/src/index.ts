import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import client from 'prom-client';
import { pool } from './db.js';
import { connectRedis, getCache, setCache } from './redis.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5004;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnetflixkey123!';

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics collection
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'user_http_request_duration_seconds',
  help: 'Duration of User HTTP requests in seconds',
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

// Extend Request interface to support JWT user payloads
interface AuthenticatedRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRole?: string;
}

// Authentication Middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalid or expired' });
    }
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  });
};

// GET: Profiles (reads from Redis cache if available)
app.get('/api/profiles', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const cacheKey = `user:${userId}:profiles`;

  try {
    const cachedProfiles = await getCache(cacheKey);
    if (cachedProfiles) {
      return res.json(JSON.parse(cachedProfiles));
    }

    const result = await pool.query(
      'SELECT id, name, avatar_url as avatar, language_preference as language, maturity_setting as maturity FROM profiles WHERE user_id = $1',
      [userId]
    );
    const profiles = result.rows;

    await setCache(cacheKey, JSON.stringify(profiles), 180); // cache for 3 minutes
    return res.json(profiles);
  } catch (err) {
    console.error('Error fetching profiles:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Create Profile
app.post('/api/profiles', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { name, avatar } = req.body;
  if (!name) return res.status(400).json({ error: 'Profile name is required' });

  try {
    const checkCount = await pool.query('SELECT COUNT(*) FROM profiles WHERE user_id = $1', [userId]);
    if (parseInt(checkCount.rows[0].count, 10) >= 5) {
      return res.status(400).json({ error: 'Maximum limit of 5 profiles reached' });
    }

    await pool.query(
      'INSERT INTO profiles (user_id, name, avatar_url) VALUES ($1, $2, $3)',
      [userId, name, avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80']
    );

    // Invalidate Cache
    await setCache(`user:${userId}:profiles`, '', 0);

    return res.status(201).json({ success: true, message: 'Profile created' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: User Bookmarks (Watchlist / My List)
app.get('/api/mylist', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const profileId = req.query.profileId;
  if (!profileId) {
    return res.status(400).json({ error: 'profileId query parameter is required' });
  }

  try {
    const result = await pool.query('SELECT movie_id FROM watchlist WHERE profile_id = $1', [profileId]);
    const movieIds = result.rows.map(row => row.movie_id);
    return res.json(movieIds);
  } catch (err) {
    console.error('Error fetching watchlist:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Toggle Watchlist (Bookmark)
app.post('/api/mylist', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { movieId, profileId } = req.body;
  if (!movieId || !profileId) {
    return res.status(400).json({ error: 'Movie ID and Profile ID are required' });
  }

  try {
    const check = await pool.query(
      'SELECT 1 FROM watchlist WHERE profile_id = $1 AND movie_id = $2',
      [profileId, movieId]
    );

    if (check.rows.length > 0) {
      await pool.query(
        'DELETE FROM watchlist WHERE profile_id = $1 AND movie_id = $2',
        [profileId, movieId]
      );
      return res.json({ bookmarked: false, message: 'Removed from watchlist' });
    } else {
      await pool.query(
        'INSERT INTO watchlist (user_id, profile_id, movie_id) VALUES ($1, $2, $3)',
        [req.userId, profileId, movieId]
      );
      return res.json({ bookmarked: true, message: 'Added to watchlist' });
    }
  } catch (err) {
    console.error('Error toggling watchlist:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: Playback History (Continue Watching)
app.get('/api/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const profileId = req.query.profileId;
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  try {
    const result = await pool.query(
      'SELECT movie_id, progress_seconds, duration_seconds FROM watch_history WHERE profile_id = $1 ORDER BY last_watched DESC',
      [profileId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching watch history:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Record Playback Progress
app.post('/api/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { movieId, profileId, progressSeconds, durationSeconds } = req.body;
  if (!movieId || !profileId) {
    return res.status(400).json({ error: 'Movie ID and Profile ID are required' });
  }

  try {
    const completed = progressSeconds >= durationSeconds * 0.9;
    await pool.query(
      `INSERT INTO watch_history (user_id, profile_id, movie_id, progress_seconds, duration_seconds, last_watched, completed)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
       ON CONFLICT (profile_id, movie_id) 
       DO UPDATE SET progress_seconds = EXCLUDED.progress_seconds, 
                     duration_seconds = EXCLUDED.duration_seconds, 
                     last_watched = CURRENT_TIMESTAMP,
                     completed = EXCLUDED.completed`,
      [req.userId, profileId, movieId, progressSeconds || 0, durationSeconds || 0, completed]
    );
    return res.json({ success: true, message: 'Playback progress updated', completed });
  } catch (err) {
    console.error('Error updating progress:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: User Profile settings
app.get('/api/user/settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userResult = await pool.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [req.userId]);
    const subResult = await pool.query('SELECT plan_name, status, current_period_end FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [req.userId]);
    
    return res.json({
      user: userResult.rows[0],
      subscription: subResult.rows[0] || { plan_name: 'None', status: 'INACTIVE' }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT: Update Profile Preferences
app.put('/api/profiles/:profileId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { profileId } = req.params;
  const { name, avatar, language, maturity } = req.body;

  try {
    await pool.query(
      `UPDATE profiles 
       SET name = COALESCE($1, name), 
           avatar_url = COALESCE($2, avatar_url),
           language_preference = COALESCE($3, language_preference),
           maturity_setting = COALESCE($4, maturity_setting)
       WHERE id = $5 AND user_id = $6`,
      [name, avatar, language, maturity, profileId, req.userId]
    );

    // Clear Cache
    await setCache(`user:${req.userId}:profiles`, '', 0);

    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: Logged in Devices
app.get('/api/user/devices', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query('SELECT id, device_name, device_type, last_active, ip_address FROM devices WHERE user_id = $1', [req.userId]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
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

// GET: Kubernetes Health Probe
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', service: 'user-service', db: 'CONNECTED' });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err });
  }
});

// Startup sequence
const startServer = async () => {
  let dbConnected = false;
  let retries = 5;

  while (!dbConnected && retries > 0) {
    try {
      await pool.query('SELECT 1');
      dbConnected = true;
    } catch (err) {
      retries -= 1;
      console.warn(`[User Service] PostgreSQL connection failed. Retrying... (${retries} attempts left)`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  await connectRedis();

  app.listen(port, () => {
    console.log(`User Microservice listening at http://localhost:${port}`);
  });
};

startServer();
