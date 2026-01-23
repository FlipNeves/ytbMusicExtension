/**
 * useUpNext - Hook for next track information
 * 
 * Single Responsibility: Subscribe to next track updates from interceptor
 */

import { useState, useEffect } from 'react';
import type { UpNextInfo } from '../types';
import { DEFAULT_UP_NEXT_INFO } from '../types';
import { onNextTrackUpdate, onApiResponse } from '../services';

// Type for playlist item from API response
interface PlaylistItem {
    playlistPanelVideoRenderer?: {
        title?: {
            runs?: Array<{ text: string }>;
            simpleText?: string;
        };
        longBylineText?: {
            runs?: Array<{ text: string }>;
        };
        shortBylineText?: {
            runs?: Array<{ text: string }>;
        };
    };
}

interface Tab {
    tabRenderer?: {
        content?: {
            musicQueueRenderer?: {
                content: {
                    playlistPanelRenderer: {
                        contents: PlaylistItem[];
                    };
                };
            };
        };
    };
}

/**
 * Hook to get information about the next track in queue
 * 
 * Listens to both DOM-based extraction and API interception
 */
export const useUpNext = () => {
    const [upNextInfo, setUpNextInfo] = useState<UpNextInfo>(DEFAULT_UP_NEXT_INFO);

    useEffect(() => {
        // Subscribe to DOM-based next track updates
        const unsubscribeDOM = onNextTrackUpdate((data) => {
            setUpNextInfo(data);
        });

        // Subscribe to API responses for queue data
        const unsubscribeAPI = onApiResponse((endpoint, data) => {
            try {
                let nextTrack = null;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const responseData = data as any;

                if (endpoint === 'next' || endpoint === 'player') {
                    if (responseData?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs) {
                        const tabs = responseData.contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer.watchNextTabbedResultsRenderer.tabs;
                        const queueTab = tabs.find((tab: Tab) => tab.tabRenderer?.content?.musicQueueRenderer);

                        if (queueTab) {
                            const queueItems = queueTab.tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents;
                            if (queueItems && queueItems.length > 1) {
                                nextTrack = queueItems[1].playlistPanelVideoRenderer;
                            }
                        }
                    }

                    if (!nextTrack && responseData?.continuationContents?.playlistPanelContinuation?.contents) {
                        const items = responseData.continuationContents.playlistPanelContinuation.contents;
                        if (items && items.length > 0) {
                            nextTrack = items[0].playlistPanelVideoRenderer;
                        }
                    }
                }

                if (endpoint === 'music/get_queue' && responseData?.queueDatas) {
                    const queueItems = responseData.queueDatas;
                    if (queueItems && queueItems.length > 1) {
                        const nextQueueData = queueItems[1];
                        if (nextQueueData.content) {
                            nextTrack = nextQueueData.content.playlistPanelVideoRenderer;
                        }
                    }
                }

                if (nextTrack) {
                    const title =
                        nextTrack.title?.runs?.[0]?.text ||
                        nextTrack.title?.simpleText ||
                        'Título desconhecido';
                    const artist =
                        nextTrack.longBylineText?.runs?.[0]?.text ||
                        nextTrack.shortBylineText?.runs?.[0]?.text ||
                        'Artista desconhecido';

                    setUpNextInfo({
                        nextTitle: title,
                        nextArtist: artist,
                    });
                }
            } catch {
                // Silently ignore API parsing errors
            }
        });

        return () => {
            unsubscribeDOM();
            unsubscribeAPI();
        };
    }, []);

    return upNextInfo;
};
