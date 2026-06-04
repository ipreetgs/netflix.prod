-- PostgreSQL Database Schema for Netflix Clone Platform

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER', -- ADMIN, EDITOR, USER
    mfa_secret VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    language_preference VARCHAR(10) DEFAULT 'en',
    maturity_setting VARCHAR(10) DEFAULT 'PG-13',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 3. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50) NOT NULL, -- Mobile, Basic, Standard, Premium
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED, EXPIRED
    price NUMERIC(10,2) DEFAULT 0.00,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- 4. Movies / Series Catalog Table
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
    category VARCHAR(50) DEFAULT 'movie', -- movie, tv_show
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies(genre);
CREATE INDEX IF NOT EXISTS idx_movies_category ON movies(category);

-- 5. Episodes Table (for TV shows)
CREATE TABLE IF NOT EXISTS episodes (
    id VARCHAR(50) PRIMARY KEY,
    series_id VARCHAR(50) REFERENCES movies(id) ON DELETE CASCADE,
    season_number INT DEFAULT 1,
    episode_number INT DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    duration VARCHAR(50),
    thumbnail_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id);

-- 6. Genres Table (explicit mapping if needed)
CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 7. Watch History Table (playback state per profile)
CREATE TABLE IF NOT EXISTS watch_history (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    profile_id INT REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id VARCHAR(50) NOT NULL,
    progress_seconds INT DEFAULT 0,
    duration_seconds INT DEFAULT 0,
    last_watched TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (profile_id, movie_id)
);
CREATE INDEX IF NOT EXISTS idx_watch_history_profile ON watch_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_last ON watch_history(last_watched DESC);

-- 8. Watchlist Table
CREATE TABLE IF NOT EXISTS watchlist (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    profile_id INT REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, movie_id)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_profile ON watchlist(profile_id);

-- 9. Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES profiles(id) ON DELETE CASCADE,
    movie_id VARCHAR(50) NOT NULL,
    score INT DEFAULT 0, -- match percentage or rating score
    reason VARCHAR(255), -- e.g., 'Because you watched Cosmic Odyssey'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_recommendations_profile ON recommendations(profile_id);

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INT REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'SUCCESS', -- SUCCESS, FAILED, PENDING
    payment_method VARCHAR(50) DEFAULT 'credit_card',
    transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- 11. Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- web, mobile, smart_tv
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

-- 12. Sessions Table (Active JWT tokens / refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
