import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import client from 'prom-client';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import http from 'http';

dotenv.config();

const app = express();
const port = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());

// Enable Prometheus metrics collection
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

// Catalog Service URL (for fetching video file path mapping)
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:5002';

// CloudFront Signing Configuration
const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || '';
const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID || '';
const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY || ''; // raw PEM private key string

// Fetch Movie Metadata from Catalog Microservice
const getMovieMetadata = (movieId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    http.get(`${CATALOG_SERVICE_URL}/api/movies/${movieId}`, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to load movie. Status: ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', (err) => reject(err));
  });
};

// GET: Secure play link (Signed URL generation)
app.get('/api/stream/:movieId', async (req, res) => {
  const { movieId } = req.params;

  try {
    // 1. Get Movie metadata to retrieve resource location
    let movieMetadata: any;
    try {
      movieMetadata = await getMovieMetadata(movieId);
    } catch (err) {
      console.warn(`Could not reach catalog service. Falling back to default stream for ID: ${movieId}`);
      movieMetadata = {
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: 'Mock Video'
      };
    }

    // 2. Generate CloudFront Signed URL if credentials exist
    if (cloudfrontDomain && keyPairId && privateKey && privateKey !== 'mock-private-key-content-goes-here') {
      const resourceUrl = `https://${cloudfrontDomain}/videos/${movieId}/master.m3u8`;
      const twoHours = 2 * 60 * 60 * 1000;
      const expirationDate = new Date(Date.now() + twoHours).toISOString();

      try {
        console.log(`[Streaming] Generating CloudFront Signed URL for ${resourceUrl}`);
        const signedUrl = getSignedUrl({
          url: resourceUrl,
          keyPairId: keyPairId,
          privateKey: privateKey,
          dateLessThan: expirationDate,
        });

        return res.json({ url: signedUrl, signed: true });
      } catch (signErr) {
        console.error('Error generating CloudFront Signed URL:', signErr);
        // Fallback to static URL
        return res.json({ url: movieMetadata.videoUrl, signed: false, error: 'Sign failed' });
      }
    }

    // 3. Fallback: Return raw public URL if credentials are not set (Dev/Local testing)
    console.log(`[Streaming - Dev Mode] CloudFront creds missing. Returning public URL: ${movieMetadata.videoUrl}`);
    return res.json({ url: movieMetadata.videoUrl, signed: false });
  } catch (err) {
    console.error('Error handling stream request:', err);
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
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'streaming-service' });
});

app.listen(port, () => {
  console.log(`Streaming Microservice listening at http://localhost:${port}`);
});
