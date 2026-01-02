import { useState, useRef, useEffect } from 'react';
import './FocusMode.css';
import Player from './Player';
import Controls from './Controls';
import UpNext from './UpNext';
import Visualizer from './Visualizer';
import FocusButton from './FocusButton';
import { useYTMObserver } from '../../hooks/useYTMObserver';
import { useVisualizer } from '../../hooks/useVisualizer';

const FocusMode = () => {
    const [isActive, setIsActive] = useState(false);
    const { songInfo, isPlaying, upNextInfo } = useYTMObserver();

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

                    <div className="focus-player">
                        <Visualizer ref={visualizerRef} />
                        <Player {...songInfo} />
                        <Controls 
                            isPlaying={isPlaying}
                            onPlayPause={() => document.querySelector<HTMLElement>('#play-pause-button')?.click()}
                            onNext={() => document.querySelector<HTMLElement>('.next-button')?.click()}
                            onPrev={() => document.querySelector<HTMLElement>('.previous-button')?.click()}
                        />
                    </div>

                    <UpNext {...upNextInfo} />
                </div>
            )}
        </>
    );
};

export default FocusMode;
