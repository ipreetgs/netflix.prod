import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Movie, fetchMovies, fetchTrending, fetchRecommendations } from '../api';
import { Billboard } from '../components/Billboard';
import { MovieRow } from '../components/MovieRow';

interface HomeProps {
  onPlay: (movie: Movie) => void;
  onOpenModal: (movie: Movie) => void;
  myList: string[];
}

export const Home: React.FC<HomeProps> = ({ onPlay, onOpenModal, myList }) => {
  const activeProfile = useSelector((state: RootState) => state.profile.activeProfile);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [recs, setRecs] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const catalogMovies = await fetchMovies();
        setMovies(catalogMovies);

        if (activeProfile) {
          const trendingMovies = await fetchTrending();
          setTrending(trendingMovies);

          const recMovies = await fetchRecommendations(activeProfile.id);
          setRecs(recMovies);
        }
      } catch (err) {
        console.error('Failed to load home page content:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [activeProfile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-brand text-2xl font-bold bg-netflix-black">
        Loading Home Experience...
      </div>
    );
  }

  const featuredMovie = movies[0] || null;
  const actionMovies = movies.filter(m => m.genre.includes('Action'));
  const scifiMovies = movies.filter(m => m.genre.includes('Sci-Fi') || m.genre.includes('Mystery'));
  const bookmarkedMovies = movies.filter(m => myList.includes(m.id));

  return (
    <div className="pb-24">
      {featuredMovie && (
        <Billboard 
          movie={featuredMovie} 
          onPlay={() => onPlay(featuredMovie)} 
          onOpenModal={() => onOpenModal(featuredMovie)} 
        />
      )}

      <div className="rows-container relative z-35 -mt-24 pl-6 flex flex-col gap-10">
        {bookmarkedMovies.length > 0 && (
          <MovieRow title="My List" movies={bookmarkedMovies} onOpenModal={onOpenModal} />
        )}

        {recs.length > 0 && (
          <MovieRow title="Recommended for You" movies={recs} onOpenModal={onOpenModal} />
        )}

        {trending.length > 0 && (
          <MovieRow title="Trending Now" movies={trending} onOpenModal={onOpenModal} />
        )}

        <MovieRow title="Sci-Fi & Thrillers" movies={scifiMovies} onOpenModal={onOpenModal} />
        <MovieRow title="Action & Adventure" movies={actionMovies} onOpenModal={onOpenModal} />
      </div>
    </div>
  );
};
