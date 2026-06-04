import React, { useState, useEffect } from 'react';
import { Movie, fetchMovies } from '../api';
import { MovieRow } from '../components/MovieRow';

interface MoviesProps {
  onOpenModal: (movie: Movie) => void;
}

export const Movies: React.FC<MoviesProps> = ({ onOpenModal }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchMovies();
        setMovies(res.filter(m => m.category === 'movie'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="p-24 text-center text-neutral-400">Loading Movies...</div>;
  }

  const sciFi = movies.filter(m => m.genre.includes('Sci-Fi'));
  const action = movies.filter(m => m.genre.includes('Action'));
  const romance = movies.filter(m => m.genre.includes('Romance'));

  return (
    <div className="pt-28 px-12 pb-24 flex flex-col gap-12">
      <h2 className="text-4xl font-extrabold font-display">Movies</h2>
      {movies.length === 0 ? (
        <p className="text-neutral-500">No movies found in catalog.</p>
      ) : (
        <div className="flex flex-col gap-10">
          <MovieRow title="Sci-Fi & Thrillers" movies={sciFi} onOpenModal={onOpenModal} />
          <MovieRow title="Action & Adventure" movies={action} onOpenModal={onOpenModal} />
          {romance.length > 0 && <MovieRow title="Romance & Comedy" movies={romance} onOpenModal={onOpenModal} />}
        </div>
      )}
    </div>
  );
};
