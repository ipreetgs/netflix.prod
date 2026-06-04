import React, { useState, useEffect } from 'react';
import { Movie, fetchMovies } from '../api';
import { MovieRow } from '../components/MovieRow';

interface TVShowsProps {
  onOpenModal: (movie: Movie) => void;
}

export const TVShows: React.FC<TVShowsProps> = ({ onOpenModal }) => {
  const [shows, setShows] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchMovies();
        setShows(res.filter(m => m.category === 'tv_show'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="p-24 text-center text-neutral-400">Loading TV Shows...</div>;
  }

  return (
    <div className="pt-28 px-12 pb-24 flex flex-col gap-12">
      <h2 className="text-4xl font-extrabold font-display">TV Shows</h2>
      {shows.length === 0 ? (
        <p className="text-neutral-500">No TV shows found in catalog.</p>
      ) : (
        <div className="flex flex-col gap-10">
          <MovieRow title="Popular TV Dramas" movies={shows} onOpenModal={onOpenModal} />
        </div>
      )}
    </div>
  );
};
