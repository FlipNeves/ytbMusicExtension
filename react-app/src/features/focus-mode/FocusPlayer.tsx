import type { RefObject } from "react";
import Controls from "./Controls";
import Player from "./Player";
import Visualizer from "./Visualizer";

interface FocusPlayerProps {
    visualizerRef: RefObject<any>;
    songInfo: Record<string, any>;
    isPlaying: boolean;
}

const FocusPlayer = ({
    visualizerRef,
    songInfo,
    isPlaying,
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
            />
        </div>
    );
};

export default FocusPlayer;
