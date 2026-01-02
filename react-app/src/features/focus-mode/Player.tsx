import React from 'react';

interface PlayerProps {
    albumArt: string;
    title: string;
    artist: string;
    currentTime: string;
    totalTime: string;
    progress: number;
}

const Player: React.FC<PlayerProps> = ({ albumArt, title, artist, currentTime, totalTime, progress }) => {
    return (
        <div className="focus-player">
            <img src={albumArt} className="focus-album-art" crossOrigin="anonymous" />
            <div className="focus-info">
                <h1 className="focus-title">{title}</h1>
                <h2 className="focus-artist">{artist}</h2>
            </div>
            
            <div className="focus-progress-container">
                <div className="focus-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="focus-time-display">
                <span className="curr-time">{currentTime}</span>
                <span className="total-time">{totalTime}</span>
            </div>
        </div>
    );
};

export default Player;
