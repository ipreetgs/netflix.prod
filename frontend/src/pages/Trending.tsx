import React, { useState, useEffect } from 'react';
import { Movie, fetchTrending } from '../api';

interface TrendingProps {
  onOpenModal: (movie: Movie) => void;
}

export const Trending: React.FC<TrendingProps> = ({ onOpenModal }) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchTrending();
        setMovies(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="p-24 text-center text-neutral-400">Loading Trending list...</div>;
  }

  return (
    <div className="pt-28 px-12 pb-24">
      <h2 className="text-4xl font-extrabold font-display mb-10">Trending Now</h2>
      {movies.length === 0 ? (
        <p className="text-neutral-500">No trending content currently logged.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {movies.map((m) => (
            <div 
              key={m.id}
              onClick={() => onOpenModal(m)}
              className="group cursor-pointer bg-netflix-card rounded overflow-hidden relative transform transition duration-300 hover:scale-105 hover:z-20"
            >
              <img src={m.thumbnailUrl} alt={m.title} className="w-full aspect-[16/9] object-cover" />
              <div className="p-3 bg-neutral-900 border-t border-neutral-800">
                <p className="font-bold text-sm truncate">{m.title}</p>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-green-500 font-semibold">{m.matchRating}% Match</span>
                  <span className="border border-neutral-600 px-1 text-[10px]">{m.maturityRating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
