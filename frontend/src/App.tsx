import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, clearCredentials, clearActiveProfile } from './store';

// Pages
import { Landing } from './pages/Landing';
import { Pricing } from './pages/Pricing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Profiles } from './pages/Profiles';
import { Home } from './pages/Home';
import { Movies } from './pages/Movies';
import { TVShows } from './pages/TVShows';
import { Trending } from './pages/Trending';
import { Watchlist } from './pages/Watchlist';
import { Search } from './pages/Search';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';

// Components
import { Navbar } from './components/Navbar';
import { Modal } from './components/Modal';
import { Player } from './components/Player';
import { Movie, userApi, fetchMovieStream } from './api';

// Route protection wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const ProfileRequiredRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const profile = useSelector((state: RootState) => state.profile.activeProfile);

  if (!token) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/profiles" replace />;
  return <>{children}</>;
};

// Internal App component to use React Router hooks
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const auth = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.profile.activeProfile);

  // Global watchlist state
  const [myList, setMyList] = useState<string[]>([]);
  
  // Shared Playback state
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string>('');

  // Shared Detail Modal state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch watchlist when active profile changes
  useEffect(() => {
    if (!auth.token || !profile) return;
    const fetchWatchlist = async () => {
      try {
        const res = await userApi.get('/api/mylist', { params: { profileId: profile.id } });
        setMyList(res.data);
      } catch (err) {
        console.error('Failed to load watchlist:', err);
      }
    };
    fetchWatchlist();
  }, [auth.token, profile]);

  const handleLogout = () => {
    dispatch(clearCredentials());
    dispatch(clearActiveProfile());
    navigate('/');
  };

  const handleSwitchProfile = () => {
    dispatch(clearActiveProfile());
    navigate('/profiles');
  };

  const handlePlayMovie = async (movie: Movie, episodeId?: string) => {
    setIsModalOpen(false);
    try {
      const streamRes = await fetchMovieStream(movie.id);
      setPlayingVideoUrl(streamRes.url);
      setPlayingMovie(movie);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMyList = async (movieId: string) => {
    if (!profile) return;
    try {
      const res = await userApi.post('/api/mylist', { movieId, profileId: profile.id });
      if (res.data.bookmarked) {
        setMyList(prev => [...prev, movieId]);
      } else {
        setMyList(prev => prev.filter(id => id !== movieId));
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  const handlePlaybackProgress = async (movieId: string, time: number, duration: number) => {
    if (!profile) return;
    const percent = Math.floor((time / duration) * 100);

    // Dynatrace Distributed Telemetry logging
    if (percent % 10 === 0 && percent > 0) {
      console.log(`[Dynatrace Tracing] TraceId: dt-tr-${movieId}-${Date.now()} SpanId: dt-sp-${percent} - Playback: ${percent}%`);
    }

    // Save progress to User Service DB
    try {
      await userApi.post('/api/history', {
        movieId,
        profileId: profile.id,
        progressSeconds: Math.floor(time),
        durationSeconds: Math.floor(duration)
      });
    } catch (err) {
      console.warn('Failed to update playback progress in database.');
    }
  };

  // If a video is playing, render the fullscreen player overlay
  if (playingMovie) {
    return (
      <Player
        movie={playingMovie}
        videoUrl={playingVideoUrl}
        onBack={() => setPlayingMovie(null)}
        onPlaybackProgress={handlePlaybackProgress}
      />
    );
  }

  // Define layout structure: show Navbar only on authenticated catalog routes
  const hideNavbarRoutes = ['/', '/login', '/register', '/pricing', '/forgot-password', '/profiles'];
  const showNavbar = auth.token && profile && !hideNavbarRoutes.includes(location.pathname);

  return (
    <div className="app-container min-h-screen text-white bg-netflix-black font-primary">
      {showNavbar && (
        <Navbar 
          onLogout={handleLogout} 
          onSwitchProfile={handleSwitchProfile} 
        />
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={auth.token ? <Navigate to="/profiles" replace /> : <Landing />} />
        <Route path="/login" element={auth.token ? <Navigate to="/profiles" replace /> : <Login />} />
        <Route path="/register" element={auth.token ? <Navigate to="/pricing" replace /> : <Register />} />
        <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Profile Routes */}
        <Route path="/profiles" element={<ProtectedRoute><Profiles /></ProtectedRoute>} />

        {/* User Catalog Routes */}
        <Route path="/home" element={<ProfileRequiredRoute><Home onPlay={handlePlayMovie} onOpenModal={(m) => { setSelectedMovie(m); setIsModalOpen(true); }} myList={myList} /></ProfileRequiredRoute>} />
        <Route path="/movies" element={<ProfileRequiredRoute><Movies onOpenModal={(m) => { setSelectedMovie(m); setIsModalOpen(true); }} /></ProfileRequiredRoute>} />
        <Route path="/tv" element={<ProfileRequiredRoute><TVShows onOpenModal={(m) => { setSelectedMovie(m); setIsModalOpen(true); }} /></ProfileRequiredRoute>} />
        <Route path="/trending" element={<ProfileRequiredRoute><Trending onOpenModal={(m) => { setSelectedMovie(m); setIsModalOpen(true); }} /></ProfileRequiredRoute>} />
        <Route path="/watchlist" element={<ProfileRequiredRoute><Watchlist onOpenModal={(m) => { setSelectedMovie(m); setIsModalOpen(true); }} myList={myList} /></ProfileRequiredRoute>} />
        <Route path="/search" element={<ProfileRequiredRoute><Search onOpenModal={(m) => { setSelectedMovie(m); setIsModalOpen(true); }} /></ProfileRequiredRoute>} />
        <Route path="/account" element={<ProfileRequiredRoute><Account /></ProfileRequiredRoute>} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Modal
        movie={selectedMovie}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlay={handlePlayMovie}
        isMyList={selectedMovie ? myList.includes(selectedMovie.id) : false}
        onToggleMyList={handleToggleMyList}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
