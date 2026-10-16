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

/**
 * Warn once in the console when a YTM internal the extension relies on is
 * gone — YTM changes without notice, and silent failures are hard to trace.
 */
const warnedKeys = new Set();
function warnOnce(key, message) {
    if (warnedKeys.has(key)) return;
    warnedKeys.add(key);
    console.warn('[Focus Mode for YouTube Music] O YouTube Music mudou: ' + message + '. Recursos que dependem disso podem não funcionar.');
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

/**
 * Get the id of the video loaded in the player.
 * #movie_player is the YouTube player API; ytmusic-player-bar.playerApi is
 * only a fallback — it is undefined on current YTM builds.
 */
function getCurrentVideoId() {
    const sources = [
        () => document.getElementById('movie_player')?.getVideoData?.()?.video_id,
        () => document.querySelector('ytmusic-player-bar')?.playerApi?.getVideoData?.()?.video_id,
    ];

    for (const source of sources) {
        try {
            const videoId = source();
            if (videoId) return videoId;
        } catch (e) {
            // Try the next source
        }
    }

    if (document.getElementById('movie_player')) {
        warnOnce('video-id', 'o player não informa o id da música (getVideoData)');
    }
    return null;
}

// ==========================================
// Section 3b: Player State & Play Next
// ==========================================

/**
 * Publish track position/duration straight from the player (#movie_player):
 * fractional seconds, relative to the track — finer than the player bar
 * slider (whole seconds) and immune to the MediaSource shared by gapless playback.
 */
function postPlayerState() {
    const player = document.getElementById('movie_player');
    if (!player) return;
    if (typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') {
        warnOnce('player-time', 'o player não expõe getCurrentTime/getDuration');
        return;
    }

    try {
        const data = player.getVideoData?.() || {};
        window.postMessage({
            type: 'YTM_PLAYER_STATE',
            currentTime: player.getCurrentTime(),
            duration: player.getDuration(),
            videoId: data.video_id || null,
            playlistId: player.getPlaylistId?.() || null,
        }, '*');
    } catch (e) {
        // Player switching tracks
    }
}

/** YTM command that inserts a track (or playlist) right after the current one */
function buildPlayNextEndpoint(target) {
    const watchEndpoint = target.videoId ? { videoId: target.videoId } : { playlistId: target.playlistId };
    const queueTarget = Object.assign({}, watchEndpoint, { onEmptyQueue: { watchEndpoint: watchEndpoint } });
    const toastText = target.videoId ? 'A música será tocada em seguida' : 'A playlist será tocada em seguida';

    return {
        queueAddEndpoint: {
            queueTarget: queueTarget,
            queueInsertPosition: 'INSERT_AFTER_CURRENT_VIDEO',
            commands: [{
                addToToastAction: {
                    item: { notificationTextRenderer: { successResponseText: { runs: [{ text: toastText }] } } },
                },
            }],
        },
    };
}

function getQueueItemData(item) {
    return item && (item.data || (item.__data && item.__data.data)) || null;
}

/** Did the queue change the way "play next" should have changed it? */
function playNextApplied(target, lengthBefore) {
    const items = Array.from(document.querySelectorAll('ytmusic-player-queue-item'));
    if (!target.videoId) return items.length > lengthBefore;

    const current = items.findIndex(function (item) { return item.hasAttribute('selected'); });
    const next = getQueueItemData(items[current + 1]);
    return !!next && next.videoId === target.videoId;
}

/**
 * Run the command the way a click on YTM's own "Tocar a seguir" menu item
 * does: YTM ignores the same command when called directly from outside.
 */
function runFromMenuItem(endpoint) {
    const app = document.querySelector('ytmusic-app');
    if (!app || !customElements.get('ytmusic-menu-service-item-renderer')) return false;

    const item = document.createElement('ytmusic-menu-service-item-renderer');
    item.style.display = 'none';
    app.appendChild(item);
    item.data = { text: { runs: [{ text: 'Tocar a seguir' }] }, serviceEndpoint: endpoint };
    item.click();
    setTimeout(function () { item.remove(); }, 1000);
    return true;
}

function runWithResolveCommand(endpoint) {
    const app = document.querySelector('ytmusic-app');
    if (!app || typeof app.resolveCommand !== 'function') return false;
    app.resolveCommand(endpoint);
    return true;
}

const wait = function (ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); };

async function playNext(target) {
    const endpoint = buildPlayNextEndpoint(target);
    const lengthBefore = document.querySelectorAll('ytmusic-player-queue-item').length;

    for (const run of [runFromMenuItem, runWithResolveCommand]) {
        try {
            if (!run(endpoint)) continue;
        } catch (e) {
            continue;
        }
        // The queue is filled from a network request: give it time
        for (let i = 0; i < 8; i++) {
            await wait(400);
            if (playNextApplied(target, lengthBefore)) return true;
        }
    }

    warnOnce('play-next', 'o comando "Tocar a seguir" não alterou a fila');
    return false;
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
        window.postMessage({ type: 'YTM_VIDEO_ID_RESPONSE', videoId: getCurrentVideoId() }, '*');
    }

    // Play next ("Tocar a seguir")
    if (event.data?.type === 'YTM_PLAY_NEXT') {
        const requestId = event.data.requestId;
        const target = { videoId: event.data.videoId || null, playlistId: event.data.playlistId || null };
        if (!target.videoId && !target.playlistId) return;

        playNext(target).then(function (ok) {
            window.postMessage({ type: 'YTM_PLAY_NEXT_RESULT', requestId: requestId, ok: ok }, '*');
        });
    }
});

// ==========================================
// Section 5: Player Observer
// ==========================================

/**
 * Observe player changes.
 *
 * O YTM recria a player bar e o <video> durante a sessão (SPA/anúncios),
 * então os vínculos são re-adquiridos sempre que o DOM muda — senão a
 * extração da próxima faixa e o envio do tempo morrem em silêncio.
 */
let mutationTimeout = null;
function debouncedExtract() {
    if (mutationTimeout) return;
    mutationTimeout = setTimeout(function () {
        mutationTimeout = null;
        extractNextTrackFromPlayer();
    }, 300);
}

let playerObserver = null;
let observedPlayerBar = null;

function ensurePlayerBindings() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (playerBar && playerBar !== observedPlayerBar) {
        if (playerObserver) playerObserver.disconnect();
        playerObserver = new MutationObserver(debouncedExtract);
        playerObserver.observe(playerBar, {
            subtree: true,
            attributes: true,
            attributeFilter: ['selected', 'play-button-state'],
            childList: true
        });
        observedPlayerBar = playerBar;
        extractNextTrackFromPlayer();
    }

    const video = document.querySelector('video');
    if (video && !video.dataset.ytmInterceptorBound) {
        video.dataset.ytmInterceptorBound = 'true';
        video.addEventListener('play', debouncedExtract);
        video.addEventListener('loadeddata', debouncedExtract);
        video.addEventListener('timeupdate', postPlayerState);
        video.addEventListener('seeked', postPlayerState);
        video.addEventListener('loadeddata', postPlayerState);
    }
}

// ==========================================
// Section 6: Initialization
// ==========================================

let bindingsTimeout = null;
new MutationObserver(function () {
    if (bindingsTimeout) return;
    bindingsTimeout = setTimeout(function () {
        bindingsTimeout = null;
        ensurePlayerBindings();
    }, 500);
}).observe(document.documentElement, { childList: true, subtree: true });

ensurePlayerBindings();
