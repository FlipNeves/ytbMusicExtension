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
    showLyrics: boolean;
    onToggleLyrics: () => void;
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
    showLyrics,
    onToggleLyrics,
}: FocusPlayerProps) => {
    return (
        <div className="focus-player">
            <Visualizer ref={visualizerRef} />
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
                onPlayPause={() =>
                    document.querySelector<HTMLElement>('#play-pause-button')?.click()
                }
            />
            <Controls
                isPlaying={isPlaying}
                onPlayPause={() =>
                    document.querySelector<HTMLElement>('#play-pause-button')?.click()
                }
                onNext={() =>
                    document.querySelector<HTMLElement>('.next-button')?.click()
                }
                onPrev={() =>
                    document.querySelector<HTMLElement>('.previous-button')?.click()
                }
                volume={volume}
                onVolumeChange={onVolumeChange}
                showLyrics={showLyrics}
                onToggleLyrics={onToggleLyrics}
            />
        </div>
    );
};

export default FocusPlayer;
