import React from 'react';

interface PlayerProps {
    albumArt: string;
    title: string;
    artist: string;
    currentTime: string;
    totalTime: string;
    progress: number;
    isLiked?: boolean;
    onLike?: () => void;
}

const Player: React.FC<PlayerProps> = ({ albumArt, title, artist, currentTime, totalTime, progress, isLiked, onLike }) => {
    return (
        <div className="focus-player-content">
            <img src={albumArt} className="focus-album-art" crossOrigin="anonymous" />

            <div className="focus-song-info">
                <div className="focus-info">
                    <h1 className="focus-title">{title}</h1>
                    <h2 className="focus-artist">{artist}</h2>
                </div>
                {onLike && (
                    <button
                        className={`focus-like-btn ${isLiked ? 'active' : ''}`}
                        title={isLiked ? "Remover curtida" : "Curtir"}
                        onClick={onLike}
                    >
                        <svg viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="focus-progress-wrapper">
                <span className="focus-time curr">{currentTime}</span>
                <div className="focus-progress-container">
                    <div className="focus-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="focus-time total">{totalTime}</span>
            </div>
        </div>
    );
};

export default Player;


