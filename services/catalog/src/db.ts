import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// DB connection string e.g. postgresql://user:pass@host:port/db
const connectionString = process.env.DATABASE_URL || 'postgresql://netflix_admin:Password123!@localhost:5432/netflix_db';

export const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Initializing catalog database schema...');
    
    // Create movies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail_url TEXT,
        video_url TEXT,
        duration VARCHAR(50),
        genre VARCHAR(100),
        year INT,
        match_rating INT,
        maturity_rating VARCHAR(10),
        cast_list TEXT[],
        category VARCHAR(50) DEFAULT 'movie',
        is_trending BOOLEAN DEFAULT FALSE
      );
    `);
    
    console.log('Catalog database schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
};
