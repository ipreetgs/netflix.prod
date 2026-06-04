// Manual database seeding helper script
// Usage: node scripts/seed-manual.js

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://netflix_admin:Password123!@localhost:5432/netflix_db';

const SEED_MOVIES = [
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
    cast: ["Sarah Jenkins", "Michael Chen", "David Oyelowo"]
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
    cast: ["Christian Bale", "Zendaya", "John Boyega"]
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
    cast: ["David Attenborough"]
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
    cast: ["Tom Hardy", "Florence Pugh", "Mads Mikkelsen"]
  },
  {
    id: "5",
    title: "Love in Paris",
    description: "Two rival pastry chefs find unexpected romance and competition when they are selected to compete in a prestigious international baking tournament.",
    thumbnailUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    duration: "1h 45m",
    genre: "Romance & Comedy",
    year: 2022,
    matchRating: 88,
    maturityRating: "PG-13",
    cast: ["Lily Collins", "Timothée Chalamet", "Jean Dujardin"]
  },
  {
    id: "6",
    title: "Deep Abyss",
    description: "A deep-sea research submarine loses power at the bottom of the Mariana Trench, forcing the crew to survive amidst unknown prehistoric predators.",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    duration: "2h 10m",
    genre: "Sci-Fi & Thriller",
    year: 2023,
    matchRating: 94,
    maturityRating: "PG-13",
    cast: ["Jason Statham", "Jessica Chastain", "Lupita Nyong'o"]
  },
  {
    id: "7",
    title: "Cyber City Chronicles",
    description: "In a fully automated neon cityscape, a rogue AI engineer tries to download his consciousness into a new physical mainframe before it is wiped.",
    thumbnailUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    duration: "1h 50m",
    genre: "Sci-Fi & Thriller",
    year: 2024,
    matchRating: 97,
    maturityRating: "R",
    cast: ["Keanu Reeves", "Scarlett Johansson", "Dev Patel"]
  },
  {
    id: "8",
    title: "Legends of the Arena",
    description: "A disgraced gladiator rises through the ranks of the provincial arenas to challenge the corrupt Emperor who murdered his family.",
    thumbnailUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    duration: "2h 25m",
    genre: "Action & Drama",
    year: 2021,
    matchRating: 91,
    maturityRating: "R",
    cast: ["Russell Crowe", "Pedro Pascal", "Connie Nielsen"]
  }
];

const seed = async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connecting to Netflix PostgreSQL Database...');

    // Clear existing values for fresh seed if database exists
    await client.query('CREATE TABLE IF NOT EXISTS movies (id VARCHAR(50) PRIMARY KEY, title VARCHAR(255), description TEXT, thumbnail_url TEXT, video_url TEXT, duration VARCHAR(50), genre VARCHAR(100), year INT, match_rating INT, maturity_rating VARCHAR(10), cast_list TEXT[])');
    await client.query('DELETE FROM movies');

    console.log('Seeding movies table...');
    for (const m of SEED_MOVIES) {
      await client.query(
        `INSERT INTO movies (id, title, description, thumbnail_url, video_url, duration, genre, year, match_rating, maturity_rating, cast_list) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [m.id, m.title, m.description, m.thumbnailUrl, m.videoUrl, m.duration, m.genre, m.year, m.matchRating, m.maturityRating, m.cast]
      );
    }
    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.end();
  }
};

seed();
