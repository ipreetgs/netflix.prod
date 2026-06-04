import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { Movie } from '../api';

interface PlayerProps {
  movie: Movie;
  videoUrl: string;
  onBack: () => void;
  onPlaybackProgress?: (movieId: string, time: number, duration: number) => void;
}

export const Player: React.FC<PlayerProps> = ({ 
  movie, 
  videoUrl, 
  onBack,
  onPlaybackProgress 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Play/Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => console.log('Playback error:', err));
    }
  };

  // Skip 10 seconds
  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  // Timeline tracking
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    
    // Call telemetry tracking callback if provided (simulating history update & Dynatrace RUM tracing)
    if (onPlaybackProgress && duration > 0) {
      onPlaybackProgress(movie.id, time, duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  // Timeline scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    videoRef.current.volume = vol;
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const mute = !isMuted;
    setIsMuted(mute);
    videoRef.current.muted = mute;
  };

  // Fullscreen management
  const toggleFullscreen = () => {
    const container = document.getElementById('player-container');
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format time (seconds to hh:mm:ss)
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return [
      h > 0 ? h : null,
      m.toString().padStart(h > 0 ? 2 : 1, '0'),
      s.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  return (
    <div id="player-container" className="player-screen">
      {/* Back Header */}
      <div className="player-back" onClick={onBack}>
        <ArrowLeft size={24} />
        <span>Watching: {movie.title}</span>
      </div>

      <div className="player-title">{movie.title}</div>

      <video
        ref={videoRef}
        className="player-video"
        src={videoUrl}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        autoPlay
      />

      {/* Custom Control Bar overlay */}
      <div className="player-controls-overlay">
        {/* Progress Bar */}
        <div className="player-timeline-wrapper" onClick={handleTimelineClick}>
          <div 
            className="player-timeline-progress" 
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* Buttons Row */}
        <div className="player-controls-row">
          <div className="player-controls-left">
            <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>

            <button onClick={() => skip(-10)} aria-label="Rewind 10 seconds">
              <RotateCcw size={22} />
            </button>

            <button onClick={() => skip(10)} aria-label="Forward 10 seconds">
              <RotateCw size={22} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={isMuted ? 0 : volume} 
                onChange={handleVolumeChange}
                style={{ width: '80px', height: '4px', accentColor: '#E50914' }}
              />
            </div>

            <div className="player-time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="player-controls-right">
            <button onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
