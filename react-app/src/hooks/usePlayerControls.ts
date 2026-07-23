/**
 * usePlayerControls - Hook for player control actions
 * 
 * Single Responsibility: Provide player control callbacks
 */

import { useCallback, useState, useEffect } from 'react';
import type { PlayerControls } from '../types';
import { setVolume as bridgeSetVolume, seekTo as bridgeSeekTo } from '../services';

/** DOM Selectors for YouTube Music controls */
const SELECTORS = {
    PLAY_PAUSE: '#play-pause-button',
    NEXT: '.next-button',
    PREVIOUS: '.previous-button',
    VOLUME_SLIDER: 'ytmusic-player-bar #volume-slider',
    LIKE_BUTTON: 'ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button',
    VIDEO: 'video',
} as const;

/**
 * Hook providing player control functions
 * 
 * Abstracts DOM interactions for controlling the YouTube Music player
 */
export const usePlayerControls = (): PlayerControls & {
    volume: number;
    isLiked: boolean;
    isPlaying: boolean;
} => {
    const [volume, setVolumeState] = useState(50);
    const [isLiked, setIsLiked] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Event-driven state synchronization (replaces 2s polling for instant updates)
    useEffect(() => {
        // Initial state sync
        const syncInitialState = () => {
            // Sync volume
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const volumeSlider = document.querySelector(SELECTORS.VOLUME_SLIDER) as any;
            if (volumeSlider && typeof volumeSlider.value === 'number') {
                setVolumeState(volumeSlider.value);
            } else {
                const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement;
                if (video) {
                    setVolumeState(Math.round(Math.sqrt(video.volume) * 100));
                }
            }

            // Sync like status
            const likeBtn = document.querySelector(SELECTORS.LIKE_BUTTON);
            if (likeBtn) {
                setIsLiked(likeBtn.getAttribute('aria-pressed') === 'true');
            }

            // Sync playing status
            const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement;
            if (video) {
                setIsPlaying(!video.paused);
            }
        };

        syncInitialState();

        // Video event handlers for instant play/pause updates
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleVolumeChange = (e: Event) => {
            const video = e.target as HTMLVideoElement;
            setVolumeState(Math.round(Math.sqrt(video.volume) * 100));
        };

        // Bind to video element (guarda referência para o cleanup correto)
        let boundVideo: HTMLVideoElement | null = null;
        const bindVideoEvents = () => {
            const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement;
            if (video && !video.dataset.playerControlsBound) {
                video.dataset.playerControlsBound = 'true';
                boundVideo = video;
                video.addEventListener('play', handlePlay);
                video.addEventListener('pause', handlePause);
                video.addEventListener('volumechange', handleVolumeChange);
                // Sync initial state from this video
                setIsPlaying(!video.paused);
            }
        };

        bindVideoEvents();

        // MutationObserver do botão de curtir, re-adquirido se a SPA recriar o botão
        let likeObserver: MutationObserver | null = null;
        let observedLikeBtn: Element | null = null;
        const ensureLikeObserver = () => {
            const likeBtn = document.querySelector(SELECTORS.LIKE_BUTTON);
            if (!likeBtn || likeBtn === observedLikeBtn) return;

            likeObserver?.disconnect();
            likeObserver = new MutationObserver(() => {
                setIsLiked(likeBtn.getAttribute('aria-pressed') === 'true');
            });
            likeObserver.observe(likeBtn, {
                attributes: true,
                attributeFilter: ['aria-pressed']
            });
            observedLikeBtn = likeBtn;
            setIsLiked(likeBtn.getAttribute('aria-pressed') === 'true');
        };

        ensureLikeObserver();

        // Re-vincula vídeo e botão de curtir quando a SPA os recria
        const retryInterval = setInterval(() => {
            const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement;
            if (video && !video.dataset.playerControlsBound) {
                bindVideoEvents();
            }
            ensureLikeObserver();
        }, 1000);

        return () => {
            clearInterval(retryInterval);
            likeObserver?.disconnect();

            if (boundVideo) {
                boundVideo.removeEventListener('play', handlePlay);
                boundVideo.removeEventListener('pause', handlePause);
                boundVideo.removeEventListener('volumechange', handleVolumeChange);
                delete boundVideo.dataset.playerControlsBound;
            }
        };
    }, []);

    const playPause = useCallback(() => {
        // Optimistic update for instant UI feedback
        setIsPlaying(prev => !prev);
        document.querySelector<HTMLElement>(SELECTORS.PLAY_PAUSE)?.click();
    }, []);

    const next = useCallback(() => {
        document.querySelector<HTMLElement>(SELECTORS.NEXT)?.click();
    }, []);

    const prev = useCallback(() => {
        document.querySelector<HTMLElement>(SELECTORS.PREVIOUS)?.click();
    }, []);

    const setVolume = useCallback((value: number) => {
        bridgeSetVolume(value);
        setVolumeState(value);
    }, []);

    const toggleLike = useCallback(() => {
        const likeBtn = document.querySelector<HTMLElement>(SELECTORS.LIKE_BUTTON);
        if (likeBtn) {
            likeBtn.click();
            setTimeout(() => {
                const updatedBtn = document.querySelector(SELECTORS.LIKE_BUTTON);
                const isNowLiked = updatedBtn?.getAttribute('aria-pressed') === 'true';
                setIsLiked(isNowLiked);
            }, 200);
        }
    }, []);

    const seekTo = useCallback((time: number) => {
        bridgeSeekTo(time);
    }, []);

    return {
        playPause,
        next,
        prev,
        setVolume,
        toggleLike,
        seekTo,
        volume,
        isLiked,
        isPlaying,
    };
};
