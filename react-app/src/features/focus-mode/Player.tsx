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
    isPlaying?: boolean;
    onLike?: () => void;
    onSeek?: (time: number) => void;
    onPlayPause?: () => void;
}

const Player: React.FC<PlayerProps> = ({
    albumArt, title, artist,
    currentTime, totalTime,
    progress, duration,
    isLiked, isPlaying, onLike, onSeek, onPlayPause
}) => {

    const progressRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const [thumbX, setThumbX] = useState(0);
    const [copied, setCopied] = useState(false);

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

    const handleShare = async () => {
        const getVideoId = (): Promise<string | null> => {
            return new Promise((resolve) => {
                const handler = (event: MessageEvent) => {
                    if (event.data?.type === 'YTM_VIDEO_ID_RESPONSE') {
                        window.removeEventListener('message', handler);
                        resolve(event.data.videoId);
                    }
                };
                window.addEventListener('message', handler);
                window.postMessage({ type: 'YTM_GET_VIDEO_ID' }, '*');
                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    resolve(null);
                }, 500);
            });
        };

        let url = window.location.href;
        const videoId = await getVideoId();
        if (videoId) {
            url = `https://music.youtube.com/watch?v=${videoId}`;
        }

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            console.error('Falha ao copiar link');
        }
    };

    return (
        <div className="focus-player-content">
            <div
                className="focus-album-container"
                onClick={onPlayPause}
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
                <img src={albumArt} className="focus-album-art" crossOrigin="anonymous" />
                <div className="focus-album-overlay">
                    {isPlaying ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </div>
            </div>

            <div className="focus-song-info">
                <button className="focus-action-btn" onClick={handleShare} title="Compartilhar">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M15 5l-1.41 1.41L15.17 8H9c-2.76 0-5 2.24-5 5v4h2v-4c0-1.65 1.35-3 3-3h6.17l-1.58 1.59L15 13l4-4-4-4z" fill="currentColor" />
                    </svg>
                </button>

                <div className="focus-info">
                    <h1 className="focus-title">{title}</h1>
                    <h2 className="focus-artist">{artist}</h2>
                </div>

                {onLike && (
                    <button
                        className={`focus-action-btn ${isLiked ? 'active' : ''}`}
                        onClick={onLike}
                        title={isLiked ? "Remover curtida" : "Curtir"}
                    >
                        {isLiked ? (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2zM9 19V9l4.34-4.34L12 9h9v2l-3 7H9z" />
                            </svg>
                        )}
                    </button>
                )}

                {copied && (
                    <div className="focus-copied-toast">Link copiado!</div>
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

