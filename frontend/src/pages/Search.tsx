import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Movie, searchApi } from '../api';

interface SearchProps {
  onOpenModal: (movie: Movie) => void;
}

export const Search: React.FC<SearchProps> = ({ onOpenModal }) => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;

    const performSearch = async () => {
      setLoading(true);
      try {
        const res = await searchApi.get('/api/search', { params: { q: query } });
        setResults(res.data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  if (loading) {
    return <div className="p-24 text-center text-neutral-400">Performing search...</div>;
  }

  return (
    <div className="pt-28 px-12 pb-24">
      <h2 className="text-2xl font-bold mb-10 text-neutral-400">
        Search results for: <span className="text-white">"{query}"</span>
      </h2>

      {results.length === 0 ? (
        <p className="text-neutral-500">Your search for "{query}" did not have any matches.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {results.map((m) => (
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
