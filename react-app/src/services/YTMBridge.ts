/**
 * YTMBridge - Communication layer with the interceptor script
 *
 * Single Responsibility: Abstract all postMessage communication with interceptor.js
 *
 * The interceptor runs in the page context and can access YouTube Music's internal APIs.
 * This bridge provides a clean interface for the React app to communicate with it.
 */

import type { UpNextInfo } from '../types';

/** Message types for communication with interceptor */
export const MESSAGE_TYPES = {
    SET_VOLUME: 'YTM_SET_VOLUME',
    SEEK: 'YTM_SEEK',
    GET_VIDEO_ID: 'YTM_GET_VIDEO_ID',
    VIDEO_ID_RESPONSE: 'YTM_VIDEO_ID_RESPONSE',
    NEXT_TRACK_DOM: 'YTM_NEXT_TRACK_DOM',
    PLAYER_STATE: 'YTM_PLAYER_STATE',
    PLAY_NEXT: 'YTM_PLAY_NEXT',
    PLAY_NEXT_RESULT: 'YTM_PLAY_NEXT_RESULT',
} as const;

/** Estado da faixa lido direto do player (#movie_player) pelo interceptor */
export interface PlayerSnapshot {
    /** Posição em segundos fracionados, relativa à faixa */
    currentTime: number;
    /** Duração da faixa em segundos */
    duration: number;
    videoId: string | null;
    /** Fila/playlist em reprodução (ex.: rádio RDAMVM...) */
    playlistId: string | null;
}

/**
 * Set player volume
 * @param value - Volume level (0-100)
 */
export const setVolume = (value: number): void => {
    window.postMessage({ type: MESSAGE_TYPES.SET_VOLUME, value }, '*');
};

/**
 * Seek to a specific time
 * @param time - Time in seconds
 */
export const seekTo = (time: number): void => {
    window.postMessage({ type: MESSAGE_TYPES.SEEK, time }, '*');
};

/**
 * Get the current video ID
 * @returns Promise resolving to video ID or null
 */
export const getVideoId = (): Promise<string | null> => {
    return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
            if (event.source !== window) return;

            if (event.data?.type === MESSAGE_TYPES.VIDEO_ID_RESPONSE) {
                window.removeEventListener('message', handler);
                resolve(event.data.videoId);
            }
        };

        window.addEventListener('message', handler);
        window.postMessage({ type: MESSAGE_TYPES.GET_VIDEO_ID }, '*');

        // Timeout after 500ms
        setTimeout(() => {
            window.removeEventListener('message', handler);
            resolve(null);
        }, 500);
    });
};

/**
 * Subscribe to next track updates from DOM-based extraction
 * @param callback - Called when next track info changes
 * @returns Unsubscribe function
 */
export const onNextTrackUpdate = (
    callback: (data: UpNextInfo) => void
): (() => void) => {
    const handler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (event.data?.type === MESSAGE_TYPES.NEXT_TRACK_DOM) {
            const data = event.data.data;
            callback({
                nextTitle: data.nextTitle || '...',
                nextArtist: data.nextArtist || '...',
            });
        }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
};

/**
 * Subscribe to player position/duration updates (~4x per second while playing)
 * @returns Unsubscribe function
 */
export const onPlayerState = (
    callback: (snapshot: PlayerSnapshot) => void
): (() => void) => {
    const handler = (event: MessageEvent) => {
        if (event.source !== window || event.data?.type !== MESSAGE_TYPES.PLAYER_STATE) return;

        const { currentTime, duration, videoId, playlistId } = event.data;
        if (!Number.isFinite(currentTime) || !Number.isFinite(duration)) return;

        callback({
            currentTime,
            duration,
            videoId: typeof videoId === 'string' ? videoId : null,
            playlistId: typeof playlistId === 'string' ? playlistId : null,
        });
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
};

let playNextSequence = 0;

/**
 * Insert a track (or playlist) right after the current one ("Tocar a seguir")
 * @returns Promise resolving to whether the queue actually changed
 */
export const playNext = (target: { videoId?: string | null; playlistId?: string | null }): Promise<boolean> =>
    new Promise((resolve) => {
        const requestId = `play-next-${Date.now()}-${++playNextSequence}`;

        const handler = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data?.type !== MESSAGE_TYPES.PLAY_NEXT_RESULT || event.data.requestId !== requestId) return;
            cleanup();
            resolve(event.data.ok === true);
        };
        const timeout = setTimeout(() => {
            cleanup();
            resolve(false);
        }, 10_000);
        const cleanup = () => {
            window.removeEventListener('message', handler);
            clearTimeout(timeout);
        };

        window.addEventListener('message', handler);
        window.postMessage({
            type: MESSAGE_TYPES.PLAY_NEXT,
            requestId,
            videoId: target.videoId ?? null,
            playlistId: target.playlistId ?? null,
        }, '*');
    });
