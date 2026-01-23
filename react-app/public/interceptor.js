/**
 * YouTube Music Interceptor
 * 
 * This script runs in the page context (not content script) to:
 * 1. Handle volume and seek commands via postMessage
 * 2. Extract next track information from the queue
 * 3. Observe player state changes
 * 
 * IMPORTANT: This file must remain as plain JavaScript (no modules)
 * because it runs in the page context via script injection.
 */

// ==========================================
// Section 1: Configuration & State
// ==========================================

/** Throttling for extract operations */
let lastExtractTime = 0;
const EXTRACT_THROTTLE_MS = 500;

/** Cache for last next track to avoid duplicate messages */
let lastNextTrack = null;

// ==========================================
// Section 2: Utility Functions
// ==========================================

/**
 * Normalize artist name for comparison
 * Handles multiple separators: commas, "e", "&"
 */
function normalizeArtist(artist) {
    if (!artist) return '';
    return artist.toLowerCase()
        .replace(/\s+e\s+/g, '|')
        .replace(/,\s*/g, '|')
        .split('|')
        .map(a => a.trim())
        .filter(a => a)
        .sort()
        .join('|');
}

/**
 * Check if a queue item is video content (not audio-only)
 */
function isVideoContent(item) {
    try {
        const data = item.data || item.__data || {};
        const watchEndpoint = data.navigationEndpoint?.watchEndpoint;
        const musicConfig = watchEndpoint?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig;
        const musicVideoType = musicConfig?.musicVideoType;

        if (musicVideoType) {
            return musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV';
        }
        return false;
    } catch (e) {
        return false;
    }
}

// ==========================================
// Section 3: Track Extraction
// ==========================================

/**
 * Extract track data from a queue item element
 */
function extractTrackFromQueueItem(item) {
    try {
        const title = item.querySelector('.song-title, .title, yt-formatted-string.title');
        const artist = item.querySelector('.byline, .secondary-flex-columns, yt-formatted-string.byline');

        if (title && title.textContent?.trim()) {
            return {
                nextTitle: title.textContent.trim(),
                nextArtist: artist?.textContent?.split('•')[0]?.trim() || '',
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Find active track index in a container
 */
function findActiveInContainer(items, nowPlayingTitle) {
    // First: check for selected attribute
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const isSelected = item.hasAttribute('selected');
        if (isSelected) {
            const trackData = extractTrackFromQueueItem(item);
            if (trackData && trackData.nextTitle === nowPlayingTitle) {
                return i;
            }
        }
    }

    // Second: check for playing state
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const playState = item.getAttribute('play-button-state');
        if (playState === 'playing' || playState === 'loading') {
            return i;
        }
    }

    // Third: match by title
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const trackData = extractTrackFromQueueItem(item);
        if (trackData && trackData.nextTitle === nowPlayingTitle) {
            return i;
        }
    }

    return -1;
}

/**
 * Find the next valid track in a list of candidates
 */
function findNextValidTrack(searchItems, startIndex, nowPlayingTitle, nowPlayingArtist) {
    const currentNormalized = normalizeArtist(nowPlayingArtist);

    for (let i = startIndex; i < searchItems.length; i++) {
        const candidateItem = searchItems[i];
        const candidateData = extractTrackFromQueueItem(candidateItem);

        if (candidateData) {
            const candidateNormalized = normalizeArtist(candidateData.nextArtist);
            const isSameTitle = candidateData.nextTitle.toLowerCase() === nowPlayingTitle.toLowerCase();
            const isSameArtist = candidateNormalized === currentNormalized;
            const isDuplicate = isSameTitle && isSameArtist;

            if (isDuplicate || isVideoContent(candidateItem)) {
                continue;
            }

            // Filter out data URLs
            if (candidateData.nextArt && candidateData.nextArt.startsWith('data:image/')) {
                candidateData.nextArt = '';
            }

            return candidateData;
        }
    }
    return null;
}

/**
 * Main function to extract next track from player queue
 */
function extractNextTrackFromPlayer() {
    try {
        const now = Date.now();
        if (now - lastExtractTime < EXTRACT_THROTTLE_MS) {
            return;
        }
        lastExtractTime = now;

        // Get now playing info
        const nowPlayingTitle = document.querySelector('.content-info-wrapper .title')?.textContent?.trim();
        const nowPlayingArtist = document.querySelector('.content-info-wrapper .byline')?.textContent?.split('•')[0]?.trim();

        if (!nowPlayingTitle) {
            return;
        }

        // Get queue panel
        const queuePanel = document.querySelector('ytmusic-player-queue');
        if (!queuePanel) return;

        const contentsContainer = queuePanel.querySelector('#contents');
        const automixContainer = queuePanel.querySelector('#automix-contents');

        const contentsItems = contentsContainer ? Array.from(contentsContainer.querySelectorAll('ytmusic-player-queue-item')) : [];
        const automixItems = automixContainer ? Array.from(automixContainer.querySelectorAll('ytmusic-player-queue-item')) : [];

        if (contentsItems.length === 0 && automixItems.length === 0) return;

        // Find current position
        let localIndex = -1;
        let isInContents = false;
        let isInAutomix = false;

        localIndex = findActiveInContainer(contentsItems, nowPlayingTitle);
        if (localIndex !== -1) {
            isInContents = true;
        } else {
            localIndex = findActiveInContainer(automixItems, nowPlayingTitle);
            if (localIndex !== -1) {
                isInAutomix = true;
            }
        }

        if (localIndex === -1) {
            localIndex = 0;
            isInContents = contentsItems.length > 0;
        }

        // Determine search scope
        let searchItems = [];
        let startIndex = 0;

        if (isInContents) {
            if (localIndex + 1 < contentsItems.length) {
                searchItems = contentsItems;
                startIndex = localIndex + 1;
            } else {
                searchItems = automixItems;
                startIndex = 0;
            }
        } else if (isInAutomix) {
            searchItems = automixItems;
            startIndex = localIndex + 1;
        }

        // Find next track
        let nextData = findNextValidTrack(searchItems, startIndex, nowPlayingTitle, nowPlayingArtist);

        // Fallback: search automix if in contents and no result
        if (!nextData && isInContents && automixItems.length > 0) {
            nextData = findNextValidTrack(automixItems, 0, nowPlayingTitle, nowPlayingArtist);
        }

        // Send message if different from last
        if (nextData) {
            const nextKey = `${nextData.nextTitle}-${nextData.nextArtist}`;
            const lastKey = `${lastNextTrack?.nextTitle}-${lastNextTrack?.nextArtist}`;

            if (nextKey !== lastKey) {
                lastNextTrack = nextData;
                window.postMessage({
                    type: 'YTM_NEXT_TRACK_DOM',
                    data: nextData
                }, '*');
            }
        }
    } catch (e) {
        // Silent fail
    }
}

// ==========================================
// Section 4: Message Handlers
// ==========================================

/**
 * Handle incoming messages from the React app
 */
window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    // Volume control
    if (event.data?.type === 'YTM_SET_VOLUME') {
        const value = event.data.value;
        const volumeSlider = document.querySelector('ytmusic-player-bar #volume-slider');

        if (volumeSlider) {
            volumeSlider.value = value;

            if (typeof volumeSlider._setImmediateValue === 'function') {
                volumeSlider._setImmediateValue(value);
            }
            if (typeof volumeSlider._updateKnob === 'function') {
                volumeSlider._updateKnob(value);
            }

            volumeSlider.dispatchEvent(new CustomEvent('immediate-value-change', { bubbles: true }));
            volumeSlider.dispatchEvent(new CustomEvent('value-change', { bubbles: true }));

            const video = document.querySelector('video');
            if (video) {
                video.volume = Math.pow(value / 100, 2);
            }
        }
    }

    // Seek control
    if (event.data?.type === 'YTM_SEEK') {
        const time = event.data.time;
        if (typeof time !== 'number') return;

        const playerBar = document.querySelector('ytmusic-player-bar');
        if (playerBar && playerBar.playerApi && typeof playerBar.playerApi.seekTo === 'function') {
            playerBar.playerApi.seekTo(time);
            return;
        }

        const moviePlayer = document.getElementById('movie_player');
        if (moviePlayer && typeof moviePlayer.seekTo === 'function') {
            moviePlayer.seekTo(time);
            return;
        }

        const video = document.querySelector('video');
        if (video) {
            video.currentTime = time;
        }
    }

    // Video ID request
    if (event.data?.type === 'YTM_GET_VIDEO_ID') {
        let videoId = null;
        try {
            const playerBar = document.querySelector('ytmusic-player-bar');
            videoId = playerBar?.playerApi?.getVideoData?.()?.video_id;
        } catch (e) {
            // Silent fail
        }
        window.postMessage({ type: 'YTM_VIDEO_ID_RESPONSE', videoId: videoId }, '*');
    }
});

// ==========================================
// Section 5: Player Observer
// ==========================================

/**
 * Set up MutationObserver for player changes
 */
function observePlayerChanges() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (!playerBar) {
        setTimeout(observePlayerChanges, 500);
        return;
    }

    // Initial extraction
    extractNextTrackFromPlayer();

    // Debounced extraction on mutations
    let mutationTimeout = null;
    const debouncedExtract = () => {
        if (mutationTimeout) return;
        mutationTimeout = setTimeout(() => {
            mutationTimeout = null;
            extractNextTrackFromPlayer();
        }, 300);
    };

    const observer = new MutationObserver(debouncedExtract);

    observer.observe(playerBar, {
        subtree: true,
        attributes: true,
        attributeFilter: ['selected', 'play-button-state'],
        childList: true
    });

    // Video events
    const video = document.querySelector('video');
    if (video) {
        video.addEventListener('play', debouncedExtract);
        video.addEventListener('loadeddata', debouncedExtract);
    }
}

// ==========================================
// Section 6: Initialization
// ==========================================

observePlayerChanges();
