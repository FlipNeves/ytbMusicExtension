/**
 * useSongState - Hook for current song information
 * 
 * Single Responsibility: Track and provide current song metadata
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SongInfo } from '../types';
import { DEFAULT_SONG_INFO } from '../types';
import {
    extractAndApplyTheme,
    setAlbumArtVariable,
    timeStateService,
} from '../services';

/** DOM Selectors for song information */
const SELECTORS = {
    TITLE: '.content-info-wrapper .title',
    ARTIST: '.content-info-wrapper .byline',
    ALBUM_ART: '.thumbnail-image-wrapper img',
    PLAYER_BAR: 'ytmusic-player-bar',
    VIDEO: 'video',
} as const;

/**
 * Hook to track and provide current song information
 * 
 * Observes YouTube Music DOM for song changes and syncs metadata
 */
export const useSongState = () => {
    const [songInfo, setSongInfo] = useState<SongInfo>(DEFAULT_SONG_INFO);
    const lastAlbumArtRef = useRef('');
    const lastSongIdRef = useRef('');

    /**
     * Sync song metadata from DOM (async part for album art)
     */
    const handleAlbumArtChange = useCallback(async (newSrc: string) => {
        if (newSrc && newSrc !== lastAlbumArtRef.current) {
            lastAlbumArtRef.current = newSrc;
            setAlbumArtVariable(newSrc);
            await extractAndApplyTheme(newSrc);
        }
    }, []);

    /**
     * Sync song metadata from DOM (sync version for event listeners)
     */
    const syncSongInfo = useCallback(() => {
        const titleEl = document.querySelector(SELECTORS.TITLE);
        const artistEl = document.querySelector(SELECTORS.ARTIST);

        const newTitle = titleEl?.textContent || 'Música';
        const newArtist = artistEl?.textContent?.split('•')[0].trim() || 'Artista';
        const songId = `${newTitle}-${newArtist}`;

        // Detect song change
        const songChanged = songId !== lastSongIdRef.current && lastSongIdRef.current !== '';

        if (songChanged) {
            lastSongIdRef.current = songId;
            timeStateService.setTransitioning(true);

            // Reset to default with new song info
            setSongInfo({
                ...DEFAULT_SONG_INFO,
                title: newTitle,
                artist: newArtist,
            });

            // Short delay then resume time updates
            setTimeout(() => {
                timeStateService.setTransitioning(false);
            }, 100);
        }

        if (lastSongIdRef.current === '') {
            lastSongIdRef.current = songId;
        }

        // Handle album art
        const artEl = document.querySelector<HTMLImageElement>(SELECTORS.ALBUM_ART);
        let newSrc = '';

        if (artEl) {
            newSrc = artEl.src;

            // Request higher resolution
            if (newSrc.includes('googleusercontent.com')) {
                newSrc = newSrc.replace(/w\d+-h\d+/, 'w1200-h1200');
            }

            // Handle album art asynchronously (fire and forget)
            void handleAlbumArtChange(newSrc);
        }

        // Get time state from centralized service
        const timeState = timeStateService.getState();

        setSongInfo((info) => ({
            ...info,
            albumArt: newSrc,
            title: newTitle,
            artist: newArtist,
            currentTime: songChanged ? '0:00' : timeState.currentTime,
            currentTimeSec: songChanged ? 0 : timeState.currentTimeSec,
            totalTime: timeState.totalTime,
            progress: songChanged ? 0 : timeState.progress,
            duration: timeState.duration,
        }));
    }, [handleAlbumArtChange]);

    // Subscribe to time state updates
    useEffect(() => {
        const unsubscribe = timeStateService.subscribe((timeState) => {
            setSongInfo((info) => ({
                ...info,
                currentTime: timeState.currentTime,
                currentTimeSec: timeState.currentTimeSec,
                totalTime: timeState.totalTime,
                progress: timeState.progress,
                duration: timeState.duration,
            }));
        });

        return unsubscribe;
    }, []);

    // Set up MutationObserver for song changes
    useEffect(() => {
        const playerBar = document.querySelector(SELECTORS.PLAYER_BAR);
        if (!playerBar) return;

        let mutationTimeout: ReturnType<typeof setTimeout> | null = null;
        const debouncedSync = () => {
            if (mutationTimeout) return;
            mutationTimeout = setTimeout(() => {
                mutationTimeout = null;
                syncSongInfo();
                timeStateService.sync();
            }, 250);
        };

        const observer = new MutationObserver(debouncedSync);
        observer.observe(playerBar, {
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-valuenow', 'aria-pressed', 'src'],
            childList: true,
        });

        // Video event handlers
        const handleEnded = () => {
            timeStateService.setTransitioning(true);
        };

        let lastTimeUpdate = 0;
        const throttledTimeUpdate = () => {
            const now = Date.now();
            if (now - lastTimeUpdate >= 250) {
                lastTimeUpdate = now;
                timeStateService.sync();
            }
        };

        const bindVideo = () => {
            const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement;
            if (video && !video.dataset.focusModeBound) {
                video.dataset.focusModeBound = 'true';
                video.addEventListener('play', syncSongInfo);
                video.addEventListener('pause', syncSongInfo);
                video.addEventListener('timeupdate', throttledTimeUpdate);
                video.addEventListener('loadeddata', syncSongInfo);
                video.addEventListener('ended', handleEnded);
            }
        };

        bindVideo();
        const videoInterval = setInterval(bindVideo, 3000);

        // Initial sync (deferred to avoid synchronous setState in effect)
        queueMicrotask(() => {
            syncSongInfo();
            timeStateService.sync();
        });

        return () => {
            observer.disconnect();
            if (mutationTimeout) clearTimeout(mutationTimeout);
            clearInterval(videoInterval);

            const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement;
            if (video) {
                video.removeEventListener('play', syncSongInfo);
                video.removeEventListener('pause', syncSongInfo);
                video.removeEventListener('timeupdate', throttledTimeUpdate);
                video.removeEventListener('loadeddata', syncSongInfo);
                video.removeEventListener('ended', handleEnded);
            }
        };
    }, [syncSongInfo]);

    return songInfo;
};
