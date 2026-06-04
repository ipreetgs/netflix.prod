import React from 'react';
import { Movie } from '../api';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onOpenModal: (movie: Movie) => void;
}

export const MovieRow: React.FC<MovieRowProps> = ({ title, movies, onOpenModal }) => {
  if (movies.length === 0) return null;

  return (
    <div className="movie-row">
      <h2 className="row-title">{title}</h2>
      <div className="row-slider">
        {movies.map((movie) => (
          <div 
            key={movie.id} 
            className="movie-card"
            onClick={() => onOpenModal(movie)}
          >
            <img src={movie.thumbnailUrl} alt={movie.title} loading="lazy" />
            <div className="movie-card-overlay">
              <div className="card-title">{movie.title}</div>
              <div className="card-meta">
                <span className="card-match">{movie.matchRating}% Match</span>
                <span className="card-maturity">{movie.maturityRating}</span>
                <span>{movie.duration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
