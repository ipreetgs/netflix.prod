import { pool } from './db.js';

interface MovieSeed {
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
  isTrending: boolean;
}

const SEED_MOVIES: MovieSeed[] = [
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
    category: "movie",
    isTrending: true
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
    category: "movie",
    isTrending: true
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
    category: "movie",
    isTrending: false
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
    category: "movie",
    isTrending: true
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
    cast: ["Lily Collins", "Timothée Chalamet", "Jean Dujardin"],
    category: "movie",
    isTrending: false
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
    cast: ["Jason Statham", "Jessica Chastain", "Lupita Nyong'o"],
    category: "movie",
    isTrending: false
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
    category: "tv_show",
    isTrending: true
  },
  {
    id: "8",
    title: "Crown & Empire",
    description: "This historical drama chronicles the political rivalries and romance of Queen Elizabeth II's reign and the events that shaped the second half of the twentieth century.",
    thumbnailUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    duration: "6 Seasons",
    genre: "Drama & History",
    year: 2023,
    matchRating: 91,
    maturityRating: "TV-MA",
    cast: ["Olivia Colman", "Imelda Staunton", "Matt Smith"],
    category: "tv_show",
    isTrending: false
  }
];

export const seedDatabase = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT COUNT(*) FROM movies');
    const count = parseInt(res.rows[0].count, 10);
    
    if (count === 0) {
      console.log('Seeding movies and series catalog database...');
      
      for (const m of SEED_MOVIES) {
        await client.query(`
          INSERT INTO movies (id, title, description, thumbnail_url, video_url, duration, genre, year, match_rating, maturity_rating, cast_list, category, is_trending)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          m.id,
          m.title,
          m.description,
          m.thumbnailUrl,
          m.videoUrl,
          m.duration,
          m.genre,
          m.year,
          m.matchRating,
          m.maturityRating,
          m.cast,
          m.category,
          m.isTrending
        ]);

        // If it's a TV Show, seed some mock episodes
        if (m.category === 'tv_show') {
          const episodes = [
            { id: `${m.id}_s1e1`, title: 'Chapter One: The Vanishing', desc: 'A child goes missing. A mysterious girl appears in the woods.', s: 1, e: 1 },
            { id: `${m.id}_s1e2`, title: 'Chapter Two: The Weirdo', desc: 'The boys hide the girl. Strange phenomena starts occurring.', s: 1, e: 2 },
            { id: `${m.id}_s1e3`, title: 'Chapter Three: Holly, Jolly', desc: 'Search parties look in the quarry. Communication from the other side.', s: 1, e: 3 }
          ];

          for (const ep of episodes) {
            await client.query(`
              INSERT INTO episodes (id, series_id, season_number, episode_number, title, description, video_url, duration, thumbnail_url)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT DO NOTHING
            `, [
              ep.id,
              m.id,
              ep.s,
              ep.e,
              ep.title,
              ep.desc,
              'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              '48m',
              m.thumbnailUrl
            ]);
          }
        }
      }
      console.log(`Successfully seeded catalog with movies, TV shows, and episodes.`);
    } else {
      console.log(`Database already seeded. Skipping catalog seed.`);
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    client.release();
  }
};
export { SEED_MOVIES };
