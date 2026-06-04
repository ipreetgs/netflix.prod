import axios from 'axios';

// Microservices Ports Mapping (Docker-compose / Local)
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:5001';
const CATALOG_SERVICE_URL = import.meta.env.VITE_CATALOG_SERVICE_URL || 'http://localhost:5002';
const STREAMING_SERVICE_URL = import.meta.env.VITE_STREAMING_SERVICE_URL || 'http://localhost:5003';
const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:5004';
const METADATA_SERVICE_URL = import.meta.env.VITE_METADATA_SERVICE_URL || 'http://localhost:5005';
const RECOMMENDATION_SERVICE_URL = import.meta.env.VITE_RECOMMENDATION_SERVICE_URL || 'http://localhost:5006';
const SEARCH_SERVICE_URL = import.meta.env.VITE_SEARCH_SERVICE_URL || 'http://localhost:5007';
const BILLING_SERVICE_URL = import.meta.env.VITE_BILLING_SERVICE_URL || 'http://localhost:5008';
const NOTIFICATION_SERVICE_URL = import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:5009';

// Axios Instances
export const authApi = axios.create({ baseURL: AUTH_SERVICE_URL });
export const userApi = axios.create({ baseURL: USER_SERVICE_URL });
export const catalogApi = axios.create({ baseURL: CATALOG_SERVICE_URL });
export const streamingApi = axios.create({ baseURL: STREAMING_SERVICE_URL });
export const metadataApi = axios.create({ baseURL: METADATA_SERVICE_URL });
export const recApi = axios.create({ baseURL: RECOMMENDATION_SERVICE_URL });
export const searchApi = axios.create({ baseURL: SEARCH_SERVICE_URL });
export const billingApi = axios.create({ baseURL: BILLING_SERVICE_URL });
export const notifApi = axios.create({ baseURL: NOTIFICATION_SERVICE_URL });

// Interceptor: Inject JWT Token
const addAuthToken = (config: any) => {
  const token = localStorage.getItem('netflix_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

authApi.interceptors.request.use(addAuthToken);
userApi.interceptors.request.use(addAuthToken);
catalogApi.interceptors.request.use(addAuthToken);
streamingApi.interceptors.request.use(addAuthToken);
metadataApi.interceptors.request.use(addAuthToken);
recApi.interceptors.request.use(addAuthToken);
searchApi.interceptors.request.use(addAuthToken);
billingApi.interceptors.request.use(addAuthToken);
notifApi.interceptors.request.use(addAuthToken);

// Movie Interface
export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  genre: string;
  year: number;
  matchRating: number;
  maturityRating: string;
  cast: string[];
  category: string;
  isTrending?: boolean;
}

// Fallback Mock data for dev offline modes
export const MOCK_MOVIES: Movie[] = [
  {
    id: "1",
    title: "Cosmic Odyssey",
    description: "In a distant future, a crew of astronauts sets out to explore a mysterious anomaly at the edge of the galaxy, only to discover a reality-bending truth.",
    thumbnailUrl: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    duration: "2h 14m",
    genre: "Sci-Fi & Fantasy",
    year: 2024,
    matchRating: 98,
    maturityRating: "PG-13",
    cast: ["Sarah Jenkins", "Michael Chen", "David Oyelowo"],
    category: "movie"
  },
  {
    id: "2",
    title: "The Midnight City",
    description: "A seasoned detective is pulled into a high-stakes conspiracy when a prominent tech billionaire goes missing in a neon-drenched metropolis.",
    thumbnailUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    duration: "1h 58m",
    genre: "Action & Thriller",
    year: 2023,
    matchRating: 95,
    maturityRating: "R",
    cast: ["Christian Bale", "Zendaya", "John Boyega"],
    category: "movie"
  },
  {
    id: "3",
    title: "Enchanted Wilderness",
    description: "Discover the breathtaking beauty and secret lives of creatures residing in the world's most remote and magical rainforests.",
    thumbnailUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration: "1h 32m",
    genre: "Documentary",
    year: 2024,
    matchRating: 99,
    maturityRating: "G",
    cast: ["David Attenborough"],
    category: "movie"
  },
  {
    id: "4",
    title: "Shadow Hunter",
    description: "An ancient warrior awakens in modern-day London to defend humanity against a clandestine faction of dark magicians seeking total control.",
    thumbnailUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    duration: "2h 05m",
    genre: "Action & Adventure",
    year: 2024,
    matchRating: 92,
    maturityRating: "PG-13",
    cast: ["Tom Hardy", "Florence Pugh", "Mads Mikkelsen"],
    category: "movie"
  },
  {
    id: "7",
    title: "Stranger Chronicles",
    description: "When a young boy vanishes from a small Indiana town, his friends uncover a series of extraordinary mysteries involving secret government experiments.",
    thumbnailUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    duration: "4 Seasons",
    genre: "Sci-Fi & Mystery",
    year: 2022,
    matchRating: 97,
    maturityRating: "TV-14",
    cast: ["Winona Ryder", "David Harbour", "Millie Bobby Brown"],
    category: "tv_show"
  }
];

// API Call Wrappers
export const fetchMovies = async (): Promise<Movie[]> => {
  try {
    const res = await catalogApi.get('/api/movies');
    return res.data;
  } catch (err) {
    console.warn("Catalog API error. Using local mock data.", err);
    return MOCK_MOVIES;
  }
};

export const fetchTrending = async (): Promise<Movie[]> => {
  try {
    const res = await recApi.get('/api/trending');
    return res.data;
  } catch (err) {
    return MOCK_MOVIES.slice(0, 3);
  }
};

export const fetchRecommendations = async (profileId: string): Promise<Movie[]> => {
  try {
    const res = await recApi.get('/api/recommendations', { params: { profileId } });
    return res.data;
  } catch (err) {
    return MOCK_MOVIES.slice(1, 4);
  }
};

export const fetchMovieStream = async (movieId: string): Promise<{ url: string }> => {
  try {
    const res = await streamingApi.get(`/api/stream/${movieId}`);
    return res.data;
  } catch (err) {
    console.warn("Streaming API error. Using local fallback video stream.", err);
    const movie = MOCK_MOVIES.find(m => m.id === movieId);
    return { url: movie ? movie.videoUrl : MOCK_MOVIES[0].videoUrl };
  }
};
