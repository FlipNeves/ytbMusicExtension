import React, { useRef, useState } from 'react';

interface PlayerProps {
    albumArt: string;
    title: string;
    artist: string;
    currentTime: string;
    totalTime: string;
    progress: number;
    duration?: number;
    isLiked?: boolean;
    onLike?: () => void;
    onSeek?: (time: number) => void;
}

const Player: React.FC<PlayerProps> = ({
    albumArt, title, artist,
    currentTime, totalTime,
    progress, duration,
    isLiked, onLike, onSeek
}) => {

    const progressRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const [thumbX, setThumbX] = useState(0);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        onSeek(percentage * duration);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        setThumbX(x);
    };

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

                <div
                    ref={progressRef}
                    className="focus-progress-container"
                    onClick={handleProgressClick}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    onMouseMove={handleMouseMove}
                >
                    <div
                        className="focus-progress-fill"
                        style={{ width: `${progress}%` }}
                    />

                    {hovered && (
                        <div
                            className="focus-progress-thumb"
                            style={{ left: thumbX }}
                        />
                    )}
                </div>

                <span className="focus-time total">{totalTime}</span>
            </div>
        </div>
    );
};

export default Player;
