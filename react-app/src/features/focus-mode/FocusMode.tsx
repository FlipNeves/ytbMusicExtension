import { useState, useRef, useEffect } from 'react';
import './styles/index.css';
import UpNext from './UpNext';
import FocusButton from './FocusButton';
import BrowserNavButtons from './BrowserNavButtons';
import { useYTMObserver } from '../../hooks/useYTMObserver';
import { openCurrentArtistPage } from '../../services/NavigationService';
import {
    canEnableVideoMode,
    getAvSelection,
    hasVideoCounterpart,
    isVideoPlaybackActive,
    switchPlayback,
    isPlayerPageOpen,
    setPlayerPageOpen,
} from '../../services/VideoModeService';
import { formatTime } from '../../services';

interface HudState {
    kind: 'volume' | 'seek';
    /** Volume (0-100) quando kind=volume */
    value: number;
    /** Texto exibido (ex.: "+10s · 1:23" ou "45%") */
    text: string;
    /** Direção do seek, para escolher o ícone */
    direction?: 'back' | 'forward';
}
import { useVisualizer } from '../../hooks/useVisualizer';
import FocusPlayer from './FocusPlayer';

import PixDonation from './PixDonation';
import Lyrics from './Lyrics';
import { ErrorBoundary } from './ErrorBoundary';

/** Classe aplicada ao body para elevar o <video> nativo acima do overlay */
const VIDEO_MODE_CLASS = 'ytm-focus-video-active';

const FocusMode = () => {
    const [isActive, setIsActive] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const { songInfo, isPlaying, upNextInfo, volume, isLiked, setVolume, toggleLike, seekTo, playPause, next, prev } = useYTMObserver();

    const visualizerRef = useRef<HTMLDivElement>(null);
    useVisualizer(visualizerRef, isPlaying && isActive);

    // Refs para o handler de teclado não precisar re-registrar a cada mudança de estado
    const stateRef = useRef({ volume, currentTimeSec: songInfo.currentTimeSec, duration: songInfo.duration });
    useEffect(() => {
        stateRef.current = { volume, currentTimeSec: songInfo.currentTimeSec, duration: songInfo.duration };
    }, [volume, songInfo.currentTimeSec, songInfo.duration]);

    // HUD de feedback dos atalhos de teclado (volume/seek)
    const [hud, setHud] = useState<HudState | null>(null);
    const hudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showHud = (next: HudState) => {
        setHud(next);
        if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
        hudTimeoutRef.current = setTimeout(() => setHud(null), 1200);
    };

    useEffect(() => {
        return () => {
            if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (isActive) {
            document.body.style.overflow = 'hidden';

            const handleKeyDown = (e: KeyboardEvent) => {
                const target = e.target as HTMLElement | null;
                const isTyping = target && (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable
                );
                if (isTyping) return;

                const { volume, currentTimeSec, duration } = stateRef.current;

                switch (e.key) {
                    case 'Escape':
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        setIsActive(false);
                        break;
                    case ' ':
                        e.preventDefault();
                        e.stopPropagation();
                        playPause();
                        break;
                    case 'ArrowRight': {
                        e.preventDefault();
                        e.stopPropagation();
                        const target = Math.min(duration || 0, currentTimeSec + 10);
                        seekTo(target);
                        showHud({ kind: 'seek', value: 0, text: `+10s · ${formatTime(target)}`, direction: 'forward' });
                        break;
                    }
                    case 'ArrowLeft': {
                        e.preventDefault();
                        e.stopPropagation();
                        const target = Math.max(0, currentTimeSec - 10);
                        seekTo(target);
                        showHud({ kind: 'seek', value: 0, text: `-10s · ${formatTime(target)}`, direction: 'back' });
                        break;
                    }
                    case 'ArrowUp': {
                        e.preventDefault();
                        e.stopPropagation();
                        const target = Math.min(100, volume + 5);
                        setVolume(target);
                        showHud({ kind: 'volume', value: target, text: `${target}%` });
                        break;
                    }
                    case 'ArrowDown': {
                        e.preventDefault();
                        e.stopPropagation();
                        const target = Math.max(0, volume - 5);
                        setVolume(target);
                        showHud({ kind: 'volume', value: target, text: `${target}%` });
                        break;
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown, true);
            return () => {
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleKeyDown, true);
            };
        } else {
            document.body.style.overflow = '';
        }
    }, [isActive, playPause, seekTo, setVolume]);

    const toggle = () => {
        setIsActive(prev => !prev);
    };

    const toggleLyricsPanel = () => {
        setShowLyrics(prev => !prev);
    };

    const handleLyricClick = (targetSeconds: number) => {
        seekTo(targetSeconds);
    };

    const handleArtistClick = () => {
        openCurrentArtistPage(songInfo.artist);
        setIsActive(false);
    };

    // Disponibilidade e estado do vídeo, via sinais do YTM
    const [videoAvailable, setVideoAvailable] = useState(false);
    const [videoActive, setVideoActive] = useState(false);
    useEffect(() => {
        if (!isActive) return;

        const check = () => {
            setVideoAvailable(canEnableVideoMode());
            setVideoActive(isVideoPlaybackActive());
        };

        check();
        const interval = setInterval(check, 1000);
        return () => clearInterval(interval);
    }, [isActive]);

    // Orquestra o modo vídeo: garante o player page aberto (necessário para o
    // <video> renderizar) e troca para a versão em vídeo. A troca via counterpart
    // da fila reinicia a faixa, então a posição é restaurada via seek.
    useEffect(() => {
        if (!(isActive && showVideo && videoAvailable)) return;

        const pageWasOpen = isPlayerPageOpen();
        let everSwitched = false;

        const enforce = () => {
            if (!isPlayerPageOpen()) setPlayerPageOpen(true);
            if (isVideoPlaybackActive()) return;

            // Av-toggle já em "Vídeo" = troca pedida, stream carregando
            if (getAvSelection() === 'video') return;

            if (hasVideoCounterpart()) {
                const resumeAt = stateRef.current.currentTimeSec;
                const method = switchPlayback('video');
                if (method) everSwitched = true;
                if (method === 'queue' && resumeAt > 3) {
                    setTimeout(() => seekTo(resumeAt), 2000);
                }
            }
        };

        enforce();
        // Mantém o vídeo ao trocar de faixa (o autoplay pode voltar para áudio)
        const interval = setInterval(enforce, 2000);

        return () => {
            clearInterval(interval);
            if (everSwitched && isVideoPlaybackActive()) {
                const resumeAt = stateRef.current.currentTimeSec;
                const method = switchPlayback('audio');
                if (method === 'queue' && resumeAt > 3) {
                    setTimeout(() => seekTo(resumeAt), 2000);
                }
            }
            if (!pageWasOpen) setPlayerPageOpen(false);
        };
    }, [isActive, showVideo, videoAvailable, seekTo]);

    // Eleva o <video> nativo do YTM para o slot da capa quando o modo vídeo está ativo.
    // O player continua intocado — só posicionamos o elemento por cima do overlay
    // via CSS vars; remover a classe restaura tudo.
    useEffect(() => {
        const root = document.documentElement;
        const clear = () => {
            document.body.classList.remove(VIDEO_MODE_CLASS);
            ['top', 'left', 'width', 'height'].forEach((key) =>
                root.style.removeProperty(`--focus-video-${key}`)
            );
        };

        // Só eleva quando o vídeo está de fato renderizando (evita bloco cinza)
        if (!(isActive && showVideo && videoActive)) {
            clear();
            return;
        }

        document.body.classList.add(VIDEO_MODE_CLASS);

        // z-index só se aplica a elementos posicionados
        const pageEl = document.querySelector<HTMLElement>('ytmusic-player-page');
        const pageWasStatic = pageEl ? getComputedStyle(pageEl).position === 'static' : false;
        if (pageEl && pageWasStatic) {
            pageEl.style.position = 'relative';
        }

        const syncPosition = () => {
            const slot = document.querySelector('#focus-overlay .focus-album-container');
            const video = document.querySelector('ytmusic-player video');
            if (!slot || !video) return;
            const rect = slot.getBoundingClientRect();
            root.style.setProperty('--focus-video-width', `${Math.round(rect.width)}px`);
            root.style.setProperty('--focus-video-height', `${Math.round(rect.height)}px`);

            // O position:fixed do <video> é relativo a um ancestral com transform,
            // não à viewport: aplica o alvo, mede o desvio real e compensa.
            const current = video.getBoundingClientRect();
            const currentTop = parseFloat(root.style.getPropertyValue('--focus-video-top')) || 0;
            const currentLeft = parseFloat(root.style.getPropertyValue('--focus-video-left')) || 0;
            const offsetX = current.left - currentLeft;
            const offsetY = current.top - currentTop;
            root.style.setProperty('--focus-video-top', `${Math.round(rect.top - offsetY)}px`);
            root.style.setProperty('--focus-video-left', `${Math.round(rect.left - offsetX)}px`);
        };

        // Duas passadas iniciais: aplica e corrige o desvio; o intervalo
        // acompanha mudanças de layout (letras, redimensionamento, transições)
        syncPosition();
        requestAnimationFrame(() => requestAnimationFrame(syncPosition));
        const interval = setInterval(syncPosition, 300);
        window.addEventListener('resize', syncPosition);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', syncPosition);
            if (pageEl && pageWasStatic) {
                pageEl.style.position = '';
            }
            clear();
        };
    }, [isActive, showVideo, videoActive]);

    return (
        <>
            <BrowserNavButtons />
            <FocusButton onClick={toggle} />
            {isActive && (
                <ErrorBoundary>
                    <div id="focus-overlay" className={`visible ${isPlaying ? 'is-playing' : ''}`}>
                        <button className="focus-close-btn" title="Sair do Modo Foco" aria-label="Fechar modo foco" onClick={toggle}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>

                        <Lyrics
                            title={songInfo.title}
                            artist={songInfo.artist}
                            isVisible={showLyrics}
                            currentTime={songInfo.currentTimeSec}
                            duration={songInfo.duration}
                            onLineClick={handleLyricClick}
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
                            onPlayPause={playPause}
                            onNext={next}
                            onPrev={prev}
                            onArtistClick={handleArtistClick}
                            showLyrics={showLyrics}
                            onToggleLyrics={toggleLyricsPanel}
                            canToggleVideo={videoAvailable}
                            showVideo={showVideo}
                            onToggleVideo={() => setShowVideo((prev) => !prev)}
                        />

                        <UpNext {...upNextInfo} />

                        {hud && (
                            <div className="focus-hud" role="status" aria-live="polite">
                                {hud.kind === 'volume' ? (
                                    <>
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                        </svg>
                                        <div className="focus-hud-bar" aria-hidden="true">
                                            <div className="focus-hud-bar-fill" style={{ width: `${hud.value}%` }} />
                                        </div>
                                        <span>{hud.text}</span>
                                    </>
                                ) : (
                                    <>
                                        {hud.direction === 'back' ? (
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                                            </svg>
                                        )}
                                        <span>{hud.text}</span>
                                    </>
                                )}
                            </div>
                        )}

                        <p className="focus-shortcuts-hint" aria-hidden="true">
                            atalhos: ← → tempo &nbsp;·&nbsp; ↑ ↓ volume &nbsp;·&nbsp; espaço pausa
                        </p>

                        <PixDonation />
                    </div>
                </ErrorBoundary>
            )}
        </>
    );
};

export default FocusMode;


