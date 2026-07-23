import type { RefObject } from 'react';
import type { SongInfo } from '../../types';
import Controls from './Controls';
import Player from './Player';
import Visualizer from './Visualizer';

interface FocusPlayerProps {
    visualizerRef: RefObject<HTMLDivElement | null>;
    songInfo: SongInfo;
    isPlaying: boolean;
    volume: number;
    isLiked: boolean;
    onVolumeChange: (value: number) => void;
    onLike: () => void;
    onSeek: (time: number) => void;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onArtistClick: () => void;
    showLyrics: boolean;
    onToggleLyrics: () => void;
    canToggleVideo: boolean;
    showVideo: boolean;
    onToggleVideo: () => void;
}

/**
 * FocusPlayer - Main player UI in focus mode
 * 
 * Refactored to use proper TypeScript types instead of `any`
 */
const FocusPlayer = ({
    visualizerRef,
    songInfo,
    isPlaying,
    volume,
    isLiked,
    onVolumeChange,
    onLike,
    onSeek,
    onPlayPause,
    onNext,
    onPrev,
    onArtistClick,
    showLyrics,
    onToggleLyrics,
    canToggleVideo,
    showVideo,
    onToggleVideo,
}: FocusPlayerProps) => {
    return (
        <div className="focus-player">
            <Visualizer ref={visualizerRef} />
            {canToggleVideo && (
                <div className="focus-av-toggle" role="group" aria-label="Alternar entre música e vídeo">
                    <button
                        className={`focus-av-btn ${!showVideo ? 'active' : ''}`}
                        aria-pressed={!showVideo}
                        onClick={() => showVideo && onToggleVideo()}
                    >
                        Música
                    </button>
                    <button
                        className={`focus-av-btn ${showVideo ? 'active' : ''}`}
                        aria-pressed={showVideo}
                        onClick={() => !showVideo && onToggleVideo()}
                    >
                        Vídeo
                    </button>
                </div>
            )}
            <Player
                albumArt={songInfo.albumArt || ''}
                title={songInfo.title || ''}
                artist={songInfo.artist || ''}
                currentTime={songInfo.currentTime || '0:00'}
                totalTime={songInfo.totalTime || '0:00'}
                progress={songInfo.progress || 0}
                duration={songInfo.duration || 0}
                isLiked={isLiked}
                isPlaying={isPlaying}
                onLike={onLike}
                onSeek={onSeek}
                onPlayPause={onPlayPause}
                onArtistClick={onArtistClick}
            />
            <Controls
                isPlaying={isPlaying}
                onPlayPause={onPlayPause}
                onNext={onNext}
                onPrev={onPrev}
                volume={volume}
                onVolumeChange={onVolumeChange}
                showLyrics={showLyrics}
                onToggleLyrics={onToggleLyrics}
            />
        </div>
    );
};

export default FocusPlayer;
