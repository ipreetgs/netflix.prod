import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import client from 'prom-client';
import { pool } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics monitoring collection
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'metadata_http_request_duration_seconds',
  help: 'Duration of Metadata HTTP requests in seconds',
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

// GET: Retrieve Video and Episode Metadata
app.get('/api/metadata/:movieId', async (req: Request, res: Response) => {
  const { movieId } = req.params;

  try {
    // 1. Get Movie details
    const movieResult = await pool.query('SELECT * FROM movies WHERE id = $1', [movieId]);
    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Movie metadata not found' });
    }
    const movie = movieResult.rows[0];

    // 2. Get episodes if tv_show
    let episodes: any[] = [];
    if (movie.category === 'tv_show') {
      const episodesResult = await pool.query(
        'SELECT * FROM episodes WHERE series_id = $1 ORDER BY season_number, episode_number',
        [movieId]
      );
      episodes = episodesResult.rows;
    }

    // 3. Subtitles mock (production reads from S3 subtitles/ folder)
    const subtitles = [
      { lang: 'en', label: 'English', url: `/subtitles/${movieId}_en.vtt` },
      { lang: 'es', label: 'Español', url: `/subtitles/${movieId}_es.vtt` },
      { lang: 'fr', label: 'Français', url: `/subtitles/${movieId}_fr.vtt` }
    ];

    // 4. Video formats metadata (adaptive formats)
    const formats = {
      hlsUrl: movie.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      resolutions: ['1080p', '720p', '480p'],
      drmProtected: false,
      audioChannels: '5.1 Dolby Digital'
    };

    return res.json({
      movieId: movie.id,
      title: movie.title,
      description: movie.description,
      year: movie.year,
      duration: movie.duration,
      genre: movie.genre,
      cast: movie.cast_list || [],
      maturityRating: movie.maturity_rating,
      category: movie.category,
      episodes,
      subtitles,
      formats
    });
  } catch (err) {
    console.error('Error fetching video metadata:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST: Add Episode to Series (Admin/Editor role)
app.post('/api/metadata/:seriesId/episodes', async (req: Request, res: Response) => {
  const { seriesId } = req.params;
  const { id, title, description, videoUrl, duration, seasonNumber, episodeNumber, thumbnailUrl } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: 'Episode ID and Title are required' });
  }

  try {
    await pool.query(
      `INSERT INTO episodes (id, series_id, season_number, episode_number, title, description, video_url, duration, thumbnail_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         video_url = EXCLUDED.video_url,
         duration = EXCLUDED.duration,
         season_number = EXCLUDED.season_number,
         episode_number = EXCLUDED.episode_number,
         thumbnail_url = EXCLUDED.thumbnail_url`,
      [id, seriesId, seasonNumber || 1, episodeNumber || 1, title, description || '', videoUrl || '', duration || '', thumbnailUrl || '']
    );

    return res.status(211).json({ success: true, message: 'Episode logged successfully' });
  } catch (err) {
    console.error('Error logging episode:', err);
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
    res.json({ status: 'UP', service: 'metadata-service', db: 'CONNECTED' });
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
      console.warn(`[Metadata Service] PostgreSQL connection failed. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  app.listen(port, () => {
    console.log(`Video Metadata Microservice listening at http://localhost:${port}`);
  });
};

startServer();
