import { useState, useRef, useEffect } from 'react';
import './FocusMode.css';
import UpNext from './UpNext';
import FocusButton from './FocusButton';
import { useYTMObserver } from '../../hooks/useYTMObserver';
import { useVisualizer } from '../../hooks/useVisualizer';
import FocusPlayer from './FocusPlayer';
import PixDonation from './PixDonation';
import Lyrics from './Lyrics';

const FocusMode = () => {
    const [isActive, setIsActive] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const { songInfo, isPlaying, upNextInfo, volume, isLiked, setVolume, toggleLike, seekTo } = useYTMObserver();

    const visualizerRef = useRef<HTMLDivElement>(null);
    useVisualizer(visualizerRef, isPlaying && isActive);

    useEffect(() => {
        if (isActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isActive]);

    const toggle = () => {
        setIsActive(prev => !prev);
    };

    const toggleLyricsPanel = () => {
        setShowLyrics(prev => !prev);
    };

    return (
        <>
            <FocusButton onClick={toggle} />
            {isActive && (
                <div id="focus-overlay" className={`visible ${isPlaying ? 'is-playing' : ''}`}>
                    <button className="focus-close-btn" title="Sair do Modo Foco" onClick={toggle}>
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>

                    

                    <Lyrics
                        title={songInfo.title}
                        artist={songInfo.artist}
                        isVisible={showLyrics}
                        currentTime={songInfo.currentTimeSec}
                    />

                    <FocusPlayer
                        visualizerRef={visualizerRef}
                        songInfo={songInfo}
                        isPlaying={isPlaying}
                        volume={volume}
                        isLiked={isLiked}
                        onVolumeChange={setVolume}
                        onLike={toggleLike}
                        onSeek={seekTo}
                        showLyrics={showLyrics}
                        onToggleLyrics={toggleLyricsPanel}
                    />

                    <UpNext {...upNextInfo} />

                    <PixDonation />
                </div>
            )}
        </>
    );
};

export default FocusMode;


