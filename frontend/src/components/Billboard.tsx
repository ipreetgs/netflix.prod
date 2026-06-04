import React from 'react';
import { Play, Info } from 'lucide-react';
import { Movie } from '../api';

interface BillboardProps {
  movie: Movie;
  onPlay: (movieId: string) => void;
  onOpenModal: (movie: Movie) => void;
}

export const Billboard: React.FC<BillboardProps> = ({ movie, onPlay, onOpenModal }) => {
  if (!movie) return null;

  return (
    <div className="billboard">
      <img 
        className="billboard-image" 
        src={movie.thumbnailUrl} 
        alt={movie.title} 
      />
      <div className="billboard-vignette"></div>
      
      <div className="billboard-content">
        <h1 className="billboard-title">{movie.title}</h1>
        <p className="billboard-desc">{movie.description}</p>
        
        <div className="billboard-actions">
          <button 
            className="btn btn-primary"
            onClick={() => onPlay(movie.id)}
          >
            <Play size={20} fill="currentColor" />
            Play
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => onOpenModal(movie)}
          >
            <Info size={20} />
            More Info
          </button>
        </div>
      </div>
    </div>
  );
};
