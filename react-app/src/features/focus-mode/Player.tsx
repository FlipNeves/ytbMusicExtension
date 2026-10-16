import React, { useRef, useState } from 'react';
import { getCurrentTrackUrl } from '../../services';
import { MESSAGES, TIMING } from '../../constants';

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
    onArtistClick?: () => void;
}

const Player: React.FC<PlayerProps> = ({
    albumArt, title, artist,
    currentTime, totalTime,
    progress, duration,
    isLiked, isPlaying, onLike, onSeek, onPlayPause, onArtistClick
}) => {

    const progressRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const [thumbX, setThumbX] = useState(0);
    const [shareToast, setShareToast] = useState<string | null>(null);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        onSeek(fraction * duration);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        setThumbX(x);
    };

    const showShareToast = (message: string) => {
        setShareToast(message);
        setTimeout(() => setShareToast(null), TIMING.TOAST_DURATION);
    };

    const handleShare = async () => {
        // Sem o id da faixa não há link certo: avisa em vez de copiar a URL da página
        const url = await getCurrentTrackUrl();
        if (!url) {
            showShareToast(MESSAGES.LINK_UNAVAILABLE);
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            showShareToast(MESSAGES.LINK_COPIED);
        } catch {
            showShareToast(MESSAGES.COPY_FAILED);
        }
    };

    return (
        <div className="focus-player-content">
            <div
                className="focus-album-container"
                onClick={onPlayPause}
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
                role="button"
                aria-label={isPlaying ? 'Pausar música' : 'Reproduzir música'}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onPlayPause?.()}
            >
                <img src={albumArt} className="focus-album-art" crossOrigin="anonymous" alt={`Capa do álbum: ${title}`} />
                <div className="focus-album-overlay" aria-hidden="true">
                    {isPlaying ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </div>
            </div>

            <div className="focus-song-info">
                <button className="focus-action-btn" onClick={handleShare} title="Compartilhar" aria-label="Compartilhar link da música">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 5l-1.41 1.41L15.17 8H9c-2.76 0-5 2.24-5 5v4h2v-4c0-1.65 1.35-3 3-3h6.17l-1.58 1.59L15 13l4-4-4-4z" fill="currentColor" />
                    </svg>
                </button>

                <div className="focus-info">
                    <h1 className="focus-title">{title}</h1>
                    <h2
                        className={`focus-artist ${onArtistClick ? 'clickable' : ''}`}
                        title={onArtistClick ? 'Ir para a página do artista' : undefined}
                        role={onArtistClick ? 'link' : undefined}
                        tabIndex={onArtistClick ? 0 : undefined}
                        onClick={onArtistClick}
                        onKeyDown={(e) => e.key === 'Enter' && onArtistClick?.()}
                    >
                        {artist}
                    </h2>
                </div>

                {onLike && (
                    <button
                        className={`focus-action-btn ${isLiked ? 'active' : ''}`}
                        onClick={onLike}
                        title={isLiked ? "Remover curtida" : "Curtir"}
                        aria-label={isLiked ? "Remover curtida da música" : "Curtir música"}
                        aria-pressed={isLiked}
                    >
                        {isLiked ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2zM9 19V9l4.34-4.34L12 9h9v2l-3 7H9z" />
                            </svg>
                        )}
                    </button>
                )}

                {shareToast && (
                    <div className="focus-copied-toast" role="status">{shareToast}</div>
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
                    role="slider"
                    aria-label="Progresso da música"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-valuetext={`${currentTime} de ${totalTime}`}
                    tabIndex={0}
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

