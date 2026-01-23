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
    API_RESPONSE: 'YTM_API_RESPONSE',
} as const;

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
 * Subscribe to API response events (for queue data from intercepted requests)
 * @param callback - Called when API response is intercepted
 * @returns Unsubscribe function
 */
export const onApiResponse = (
    callback: (endpoint: string, data: unknown) => void
): (() => void) => {
    const handler = (event: MessageEvent) => {
        if (event.source !== window) return;

        if (event.data?.type === MESSAGE_TYPES.API_RESPONSE) {
            callback(event.data.endpoint, event.data.data);
        }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
};
