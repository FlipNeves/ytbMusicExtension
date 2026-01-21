const originalFetch = window.fetch;

window.addEventListener('message', (event) => {
    if (event.source !== window) return;

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

    if (event.data?.type === 'YTM_SEEK') {
        const time = event.data.time;
        const video = document.querySelector('video');
        if (video && typeof time === 'number') {
            video.currentTime = time;
        }
    }

    if (event.data?.type === 'YTM_GET_VIDEO_ID') {
        let videoId = null;
        try {
            const playerBar = document.querySelector('ytmusic-player-bar');
            videoId = playerBar?.playerApi?.getVideoData?.()?.video_id;
        } catch { }
        window.postMessage({ type: 'YTM_VIDEO_ID_RESPONSE', videoId: videoId }, '*');
    }
});

const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    return originalXHROpen.call(this, method, url, ...rest);
};

let lastExtractTime = 0;
let lastNextTrack = null;

function extractNextTrackFromPlayer() {
    try {
        const now = Date.now();
        if (now - lastExtractTime < 500) {
            return;
        }
        lastExtractTime = now;

        const nowPlayingTitle = document.querySelector('.content-info-wrapper .title')?.textContent?.trim();
        const nowPlayingArtist = document.querySelector('.content-info-wrapper .byline')?.textContent?.split('•')[0]?.trim();

        const nowPlayingArtElement = document.querySelector('.ytmusic-player-bar img, ytmusic-player-bar img, #player-bar-artist img, .player-bar img');
        const nowPlayingArtURL = nowPlayingArtElement?.src || '';

        if (!nowPlayingTitle) {
            return;
        }

        const queuePanel = document.querySelector('ytmusic-player-queue');
        if (queuePanel) {
            const contentsContainer = queuePanel.querySelector('#contents');
            const automixContainer = queuePanel.querySelector('#automix-contents');

            const contentsItems = contentsContainer ? Array.from(contentsContainer.querySelectorAll('ytmusic-player-queue-item')) : [];
            const automixItems = automixContainer ? Array.from(automixContainer.querySelectorAll('ytmusic-player-queue-item')) : [];

            const allItems = [...contentsItems, ...automixItems];

            if (allItems.length > 0) {
                let currentIndex = -1;
                let isInContents = false;
                let isInAutomix = false;
                let localIndex = -1;

                function findActiveInContainer(items) {
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
                    for (let i = items.length - 1; i >= 0; i--) {
                        const item = items[i];
                        const playState = item.getAttribute('play-button-state');
                        if (playState === 'playing' || playState === 'loading') {
                            return i;
                        }
                    }
                    for (let i = items.length - 1; i >= 0; i--) {
                        const item = items[i];
                        const trackData = extractTrackFromQueueItem(item);
                        if (trackData && trackData.nextTitle === nowPlayingTitle) {
                            return i;
                        }
                    }
                    return -1;
                }

                localIndex = findActiveInContainer(contentsItems);
                if (localIndex !== -1) {
                    isInContents = true;
                    currentIndex = localIndex;
                } else {
                    localIndex = findActiveInContainer(automixItems);
                    if (localIndex !== -1) {
                        isInAutomix = true;
                        currentIndex = contentsItems.length + localIndex;
                    }
                }

                if (currentIndex === -1) {
                    currentIndex = 0;
                    isInContents = contentsItems.length > 0;
                }

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

                let nextData = null;
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

                for (let i = startIndex; i < searchItems.length; i++) {
                    const candidateItem = searchItems[i];
                    const candidateData = extractTrackFromQueueItem(candidateItem);

                    if (candidateData) {
                        const normalizeArtist = (artist) => {
                            return artist.toLowerCase()
                                .replace(/\s+e\s+/g, '|')
                                .replace(/,\s*/g, '|')
                                .split('|')
                                .map(a => a.trim())
                                .filter(a => a)
                                .sort()
                                .join('|');
                        };

                        const currentNormalized = normalizeArtist(nowPlayingArtist);
                        const candidateNormalized = normalizeArtist(candidateData.nextArtist);

                        const isSameTitle = candidateData.nextTitle.toLowerCase() === nowPlayingTitle.toLowerCase();
                        const isSameArtist = candidateNormalized === currentNormalized;
                        const isDuplicate = isSameTitle && isSameArtist;

                        if (isDuplicate || isVideoContent(candidateItem)) {
                            continue;
                        } else {
                            nextData = candidateData;

                            if (nextData.nextArt && nextData.nextArt.startsWith('data:image/')) {
                                nextData.nextArt = '';
                            }

                            break;
                        }
                    }
                }

                if (!nextData && isInContents && automixItems.length > 0) {
                    for (let i = 0; i < automixItems.length; i++) {
                        const candidateItem = automixItems[i];
                        const candidateData = extractTrackFromQueueItem(candidateItem);

                        if (candidateData) {
                            const normalizeArtist = (artist) => {
                                return artist.toLowerCase()
                                    .replace(/\s+e\s+/g, '|')
                                    .replace(/,\s*/g, '|')
                                    .split('|')
                                    .map(a => a.trim())
                                    .filter(a => a)
                                    .sort()
                                    .join('|');
                            };

                            const currentNormalized = normalizeArtist(nowPlayingArtist);
                            const candidateNormalized = normalizeArtist(candidateData.nextArtist);

                            const isSameTitle = candidateData.nextTitle.toLowerCase() === nowPlayingTitle.toLowerCase();
                            const isSameArtist = candidateNormalized === currentNormalized;
                            const isDuplicate = isSameTitle && isSameArtist;

                            if (isDuplicate || isVideoContent(candidateItem)) {
                                continue;
                            } else {
                                nextData = candidateData;

                                if (nextData.nextArt && nextData.nextArt.startsWith('data:image/')) {
                                    nextData.nextArt = '';
                                }

                                break;
                            }
                        }
                    }
                }

                if (nextData) {
                    const nextKey = `${nextData.nextTitle}-${nextData.nextArtist}`;
                    const lastKey = `${lastNextTrack?.nextTitle}-${lastNextTrack?.nextArtist}`;

                    if (nextKey !== lastKey) {
                        lastNextTrack = nextData;
                        window.postMessage({
                            type: 'YTM_NEXT_TRACK_DOM',
                            data: nextData
                        }, '*');
                        return nextData;
                    }
                }
            }
        }

    } catch (e) { }
}

function extractTrackFromQueueItem(item, debug = false) {
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
    } catch (e) { }
    return null;
}

function observePlayerChanges() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (!playerBar) {
        setTimeout(observePlayerChanges, 500);
        return;
    }

    extractNextTrackFromPlayer();

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

    const video = document.querySelector('video');
    if (video) {
        video.addEventListener('play', debouncedExtract);
        video.addEventListener('loadeddata', debouncedExtract);
    }
}

observePlayerChanges();
