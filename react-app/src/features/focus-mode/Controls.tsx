import React from 'react';

interface ControlsProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    volume: number;
    onVolumeChange: (value: number) => void;
    showLyrics?: boolean;
    onToggleLyrics?: () => void;
}

const Controls: React.FC<ControlsProps> = ({
    isPlaying,
    onPlayPause,
    onNext,
    onPrev,
    volume,
    onVolumeChange,
    showLyrics,
    onToggleLyrics,
}) => {
    return (
        <div className="focus-controls">
            {onToggleLyrics && (
                <button
                    className={`focus-btn lyrics-toggle ${showLyrics ? 'active' : ''}`}
                    title={showLyrics ? 'Ocultar letra' : 'Mostrar letra'}
                    aria-label={showLyrics ? 'Ocultar letra da música' : 'Mostrar letra da música'}
                    aria-pressed={showLyrics}
                    onClick={onToggleLyrics}
                >
                    <svg viewBox="0 0 24 24" fill={showLyrics ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill={showLyrics ? "currentColor" : "none"} />
                    </svg>
                </button>
            )}
            <button className="focus-btn prev" title="Anterior" aria-label="Música anterior" onClick={onPrev}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path></svg>
            </button>
            <button className="focus-btn play-pause" title={isPlaying ? 'Pausar' : 'Reproduzir'} aria-label={isPlaying ? 'Pausar música' : 'Reproduzir música'} onClick={onPlayPause}>
                <svg viewBox="0 0 24 24" className="icon-play" style={{ display: isPlaying ? 'none' : 'block' }} aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>
                <svg viewBox="0 0 24 24" className="icon-pause" style={{ display: isPlaying ? 'block' : 'none' }} aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
            </button>
            <button className="focus-btn next" title="Próxima" aria-label="Próxima música" onClick={onNext}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>
            </button>

            <div className="focus-volume-container">
                <svg viewBox="0 0 24 24" className="volume-icon" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="focus-volume-slider"
                    aria-label={`Volume: ${volume}%`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={volume}
                />
            </div>
        </div>
    );
};

export default Controls;

