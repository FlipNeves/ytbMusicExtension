import type { RefObject } from "react";
import Controls from "./Controls";
import Player from "./Player";
import Visualizer from "./Visualizer";

interface FocusPlayerProps {
    visualizerRef: RefObject<any>;
    songInfo: Record<string, any>;
    isPlaying: boolean;
    volume: number;
    isLiked: boolean;
    onVolumeChange: (value: number) => void;
    onLike: () => void;
}

const FocusPlayer = ({
    visualizerRef,
    songInfo,
    isPlaying,
    volume,
    isLiked,
    onVolumeChange,
    onLike,
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
                isLiked={isLiked}
                onLike={onLike}
            />
            <Controls
                isPlaying={isPlaying}
                onPlayPause={() =>
                    document.querySelector<HTMLElement>("#play-pause-button")?.click()
                }
                onNext={() =>
                    document.querySelector<HTMLElement>(".next-button")?.click()
                }
                onPrev={() =>
                    document.querySelector<HTMLElement>(".previous-button")?.click()
                }
                volume={volume}
                onVolumeChange={onVolumeChange}
            />
        </div>
    );
};

export default FocusPlayer;
