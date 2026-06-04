import React, { useState, useEffect } from 'react';
import { X, Play, Plus, Check } from 'lucide-react';
import { Movie, metadataApi } from '../api';

interface ModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (movie: Movie, episodeId?: string) => void;
  isMyList: boolean;
  onToggleMyList: (movieId: string) => void;
}

export const Modal: React.FC<ModalProps> = ({
  movie,
  isOpen,
  onClose,
  onPlay,
  isMyList,
  onToggleMyList
}) => {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => {
    if (!isOpen || !movie) return;

    const loadMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const res = await metadataApi.get(`/api/metadata/${movie.id}`);
        setEpisodes(res.data.episodes || []);
        setSubtitles(res.data.subtitles || []);
      } catch (err) {
        console.warn('Failed to load metadata from Metadata service. Using fallbacks.');
        setEpisodes([]);
        setSubtitles([]);
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [isOpen, movie]);

  if (!isOpen || !movie) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="modal-hero">
          <img src={movie.thumbnailUrl} alt={movie.title} />
          <div className="modal-vignette text-white"></div>
          
          <div className="modal-hero-content text-white">
            <h1 className="modal-title">{movie.title}</h1>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => onPlay(movie)}
              >
                <Play size={18} fill="currentColor" />
                Play
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={() => onToggleMyList(movie.id)}
                style={{ padding: '12px' }}
                aria-label={isMyList ? "Remove from List" : "Add to List"}
              >
                {isMyList ? <Check size={18} /> : <Plus size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="modal-body text-white bg-netflix-card">
          <div className="modal-info-left">
            <div className="modal-meta-row">
              <span style={{ color: '#46d369', fontWeight: 600 }}>{movie.matchRating}% Match</span>
              <span>{movie.year}</span>
              <span className="card-maturity">{movie.maturityRating}</span>
              <span>{movie.duration}</span>
            </div>
            
            <p className="modal-plot">{movie.description}</p>

            {/* Subtitles available list */}
            {subtitles.length > 0 && (
              <div className="mt-4 text-xs text-neutral-400">
                <p>Audio Languages: English [Original], Español</p>
                <p className="mt-1">Subtitles: {subtitles.map(s => s.label).join(', ')}</p>
              </div>
            )}
          </div>

          <div className="modal-info-right">
            <div className="modal-tag">
              <span>Cast: </span>{movie.cast.join(', ')}
            </div>
            <div className="modal-tag">
              <span>Genre: </span>{movie.genre}
            </div>
            <div className="modal-tag">
              <span>Maturity rating: </span>{movie.maturityRating} (Recommended for viewers age {movie.maturityRating === 'G' ? 'all ages' : movie.maturityRating === 'PG-13' ? '13 and older' : '17 and older'})
            </div>
          </div>
        </div>

        {/* TV Series Episodes List Section */}
        {movie.category === 'tv_show' && (
          <div className="px-10 pb-8 bg-netflix-card text-white border-t border-neutral-800 pt-6">
            <h3 className="text-xl font-bold mb-4">Episodes</h3>
            {loadingMetadata ? (
              <p className="text-sm text-neutral-500">Loading episodes list...</p>
            ) : episodes.length === 0 ? (
              <p className="text-sm text-neutral-500">No episodes logged for this series.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {episodes.map((ep) => (
                  <div key={ep.id} className="flex gap-4 p-4 hover:bg-neutral-800 rounded transition duration-200 cursor-pointer" onClick={() => onPlay(movie, ep.id)}>
                    <img src={ep.thumbnail_url || movie.thumbnailUrl} className="w-32 aspect-[16/9] object-cover rounded shadow" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-sm">{ep.episode_number}. {ep.title}</h4>
                        <span className="text-xs text-neutral-400">{ep.duration}</span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">{ep.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
