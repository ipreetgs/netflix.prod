import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import client from 'prom-client';
import { pool } from './db.js';
import { connectRedis, getCache, setCache } from './redis.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5006;

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics monitoring collection
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'recommendation_http_request_duration_seconds',
  help: 'Duration of Recommendation HTTP requests in seconds',
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

// GET: Personalized Recommendations for a Profile
app.get('/api/recommendations', async (req: Request, res: Response) => {
  const profileId = req.query.profileId as string;
  if (!profileId) {
    return res.status(400).json({ error: 'profileId is required' });
  }

  const cacheKey = `recommendations:${profileId}`;

  try {
    // 1. Try Redis Cache
    const cachedRecs = await getCache(cacheKey);
    if (cachedRecs) {
      console.log(`[Cache Hit] Serving recommendations for profile ${profileId} from Redis`);
      return res.json(JSON.parse(cachedRecs));
    }

    console.log(`[Cache Miss] Computing recommendations for profile ${profileId}...`);

    // 2. Query Profile Preference / History
    const historyResult = await pool.query(
      'SELECT movie_id FROM watch_history WHERE profile_id = $1 ORDER BY last_watched DESC LIMIT 5',
      [profileId]
    );
    const watchedMovieIds = historyResult.rows.map(r => r.movie_id);

    let recommendedMovies: any[] = [];

    if (watchedMovieIds.length > 0) {
      // Find movies in the same genres that haven't been watched yet
      const genresResult = await pool.query(
        'SELECT DISTINCT genre FROM movies WHERE id = ANY($1)',
        [watchedMovieIds]
      );
      const genres = genresResult.rows.map(g => g.genre);

      if (genres.length > 0) {
        const recResult = await pool.query(
          `SELECT * FROM movies 
           WHERE genre = ANY($1) 
           AND id != ANY($2) 
           ORDER BY match_rating DESC 
           LIMIT 6`,
          [genres, watchedMovieIds]
        );
        recommendedMovies = recResult.rows;
      }
    }

    // Fallback: If no custom history or too few recommendations, serve top rated general movies
    if (recommendedMovies.length < 4) {
      const remainingLimit = 6 - recommendedMovies.length;
      const excludeIds = watchedMovieIds.concat(recommendedMovies.map(m => m.id));
      
      const fallbackResult = await pool.query(
        `SELECT * FROM movies 
         WHERE NOT (id = ANY($1)) 
         ORDER BY match_rating DESC 
         LIMIT $2`,
        [excludeIds.length > 0 ? excludeIds : [''], remainingLimit]
      );
      recommendedMovies = recommendedMovies.concat(fallbackResult.rows);
    }

    const mappedRecs = recommendedMovies.map(row => ({
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
      reason: watchedMovieIds.length > 0 ? 'Because you watched similar titles' : 'Top matches for you'
    }));

    // Cache in Redis for 10 minutes
    await setCache(cacheKey, JSON.stringify(mappedRecs), 600);

    return res.json(mappedRecs);
  } catch (err) {
    console.error('Error in recommendations engine:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET: Trending content
app.get('/api/trending', async (req: Request, res: Response) => {
  const cacheKey = 'trending:movies';

  try {
    const cachedTrending = await getCache(cacheKey);
    if (cachedTrending) {
      return res.json(JSON.parse(cachedTrending));
    }

    // Query most watched or flagged trending movies
    const result = await pool.query(
      `SELECT m.*, COUNT(w.movie_id) as watch_count 
       FROM movies m
       LEFT JOIN watch_history w ON m.id = w.movie_id
       GROUP BY m.id
       ORDER BY m.is_trending DESC, watch_count DESC, m.match_rating DESC
       LIMIT 8`
    );

    const trending = result.rows.map(row => ({
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

    // Cache in Redis for 5 minutes
    await setCache(cacheKey, JSON.stringify(trending), 300);

    return res.json(trending);
  } catch (err) {
    console.error('Error fetching trending content:', err);
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
    res.json({ status: 'UP', service: 'recommendation-service', db: 'CONNECTED' });
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
      console.warn(`[Recommendation Service] PostgreSQL connection failed. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  await connectRedis();

  app.listen(port, () => {
    console.log(`Recommendation Microservice listening at http://localhost:${port}`);
  });
};

startServer();
