import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import client from 'prom-client';
import { pool, initDb } from './db.js';
import { connectRedis, getCache, setCache } from './redis.js';
import { seedDatabase } from './seed.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics monitoring collection
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom Prometheus metric: HTTP Request latency histogram
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in microseconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
register.registerMetric(httpRequestDurationMicroseconds);

// Metric middleware to track latency
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    if (req.route) {
      end({ method: req.method, route: req.route.path, code: res.statusCode });
    }
  });
  next();
});

// Cache Keys constants
const CACHE_MOVIES_KEY = 'catalog:movies:all';

// GET: Retrieve all movies (cached)
app.get('/api/movies', async (req, res) => {
  try {
    // 1. Try to read from Redis Cache
    const cachedData = await getCache(CACHE_MOVIES_KEY);
    if (cachedData) {
      console.log('[Cache Hit] Serving movies list from Redis.');
      return res.json(JSON.parse(cachedData));
    }

    console.log('[Cache Miss] Fetching movies list from PostgreSQL...');
    // 2. Fallback to PostgreSQL Query
    const result = await pool.query('SELECT * FROM movies');
    const movies = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      videoUrl: row.video_url,
      duration: row.duration,
      genre: row.genre,
      year: row.year,
      matchRating: row.match_rating,
      maturityRating: row.maturity_rating,
      cast: row.cast_list || [],
      category: row.category,
      isTrending: row.is_trending
    }));

    // 3. Store back in Redis
    await setCache(CACHE_MOVIES_KEY, JSON.stringify(movies), 300); // cache for 5 minutes

    return res.json(movies);
  } catch (err) {
    console.error('Error fetching movies:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: Retrieve specific movie metadata
app.get('/api/movies/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `catalog:movies:${id}`;

  try {
    const cachedMovie = await getCache(cacheKey);
    if (cachedMovie) {
      console.log(`[Cache Hit] Serving movie ${id} from Redis.`);
      return res.json(JSON.parse(cachedMovie));
    }

    const result = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const row = result.rows[0];
    const movie = {
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      videoUrl: row.video_url,
      duration: row.duration,
      genre: row.genre,
      year: row.year,
      matchRating: row.match_rating,
      maturityRating: row.maturity_rating,
      cast: row.cast_list || [],
      category: row.category,
      isTrending: row.is_trending
    };

    await setCache(cacheKey, JSON.stringify(movie), 300);

    return res.json(movie);
  } catch (err) {
    console.error('Error fetching movie:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: Search movie catalog
app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const searchQuery = `%${query.toLowerCase()}%`;
    const result = await pool.query(
      `SELECT * FROM movies 
       WHERE LOWER(title) LIKE $1 
       OR LOWER(genre) LIKE $1 
       OR LOWER(array_to_string(cast_list, ',')) LIKE $1`,
      [searchQuery]
    );

    const movies = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      videoUrl: row.video_url,
      duration: row.duration,
      genre: row.genre,
      year: row.year,
      matchRating: row.match_rating,
      maturityRating: row.maturity_rating,
      cast: row.cast_list || [],
    }));

    return res.json(movies);
  } catch (err) {
    console.error('Search query failed:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// GET: Prometheus Metrics Endpoint for monitoring
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// GET: Kubernetes Liveness Probe
app.get('/health', async (req, res) => {
  try {
    // Check Database connection
    await pool.query('SELECT 1');
    res.json({ status: 'UP', service: 'catalog-service', db: 'CONNECTED' });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err });
  }
});

// Start-up sequence with retry logic (critical for container environments)
const startServer = async () => {
  let dbConnected = false;
  let retries = 5;

  while (!dbConnected && retries > 0) {
    try {
      await initDb();
      await seedDatabase();
      dbConnected = true;
    } catch (err) {
      retries -= 1;
      console.warn(`Database connection failed. Retrying in 5 seconds... (${retries} attempts left)`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  await connectRedis();

  app.listen(port, () => {
    console.log(`Catalog Microservice listening at http://localhost:${port}`);
  });
};

startServer();
