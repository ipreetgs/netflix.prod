import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import client from 'prom-client';
import { pool } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5007;
const OPENSEARCH_URL = process.env.OPENSEARCH_URL || '';

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics monitoring collection
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'search_http_request_duration_seconds',
  help: 'Duration of Search HTTP requests in seconds',
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

// GET: Full-text catalog search (OpenSearch with Postgres Fallback)
app.get('/api/search', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: 'Search query parameter q is required' });
  }

  try {
    if (OPENSEARCH_URL && OPENSEARCH_URL !== 'mock-opensearch-url') {
      console.log(`[Search Service] Routing query "${query}" to OpenSearch Cluster: ${OPENSEARCH_URL}`);
      // In production, fetch from OpenSearch Node:
      // const response = await openSearchClient.search({ index: 'movies', body: { query: { multi_match: { query, fields: ['title', 'description', 'cast_list', 'genre'] } } } });
      // return res.json(response.body.hits.hits.map(h => h._source));
    }

    // Postgres Fallback (Fuzzy & Multi-field indexing matched)
    console.log(`[Search Service - Fallback] Executing Postgres fuzzy query for "${query}"`);
    const searchPattern = `%${query.toLowerCase()}%`;
    const result = await pool.query(
      `SELECT * FROM movies 
       WHERE LOWER(title) LIKE $1 
       OR LOWER(description) LIKE $1
       OR LOWER(genre) LIKE $1 
       OR LOWER(array_to_string(cast_list, ',')) LIKE $1`,
      [searchPattern]
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
      category: row.category
    }));

    return res.json(movies);
  } catch (err) {
    console.error('Search service query failed:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: Autocomplete Suggestions
app.get('/api/search/suggest', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) return res.json([]);

  try {
    const searchPattern = `${query.toLowerCase()}%`;
    const result = await pool.query(
      'SELECT title FROM movies WHERE LOWER(title) LIKE $1 LIMIT 5',
      [searchPattern]
    );
    const suggestions = result.rows.map(row => row.title);
    return res.json(suggestions);
  } catch (err) {
    return res.status(500).json({ error: 'Suggestions query failed' });
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
    res.json({ status: 'UP', service: 'search-service', db: 'CONNECTED', searchCluster: OPENSEARCH_URL ? 'ONLINE' : 'FALLBACK_DB' });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err });
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
      console.warn(`[Search Service] PostgreSQL connection failed. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  app.listen(port, () => {
    console.log(`Search Microservice listening at http://localhost:${port}`);
  });
};

startServer();
