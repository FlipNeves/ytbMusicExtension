import React from 'react';

interface ControlsProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, onNext, onPrev }) => {
    return (
        <div className="focus-controls">
            <button className="focus-btn prev" title="Anterior" onClick={onPrev}>
                <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path></svg>
            </button>
            <button className="focus-btn play-pause" title="Play/Pause" onClick={onPlayPause}>
                <svg viewBox="0 0 24 24" className="icon-play" style={{ display: isPlaying ? 'none' : 'block' }}><path d="M8 5v14l11-7z"></path></svg>
                <svg viewBox="0 0 24 24" className="icon-pause" style={{ display: isPlaying ? 'block' : 'none' }}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
            </button>
            <button className="focus-btn next" title="Próximo" onClick={onNext}>
                <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>
            </button>
        </div>
    );
};

export default Controls;
