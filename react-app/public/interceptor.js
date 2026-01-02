const originalFetch = window.fetch;

window.fetch = async (...args) => {
    const [url, config] = args;
    const response = await originalFetch(...args);

    if (typeof url === 'string' && url.includes('/youtubei/v1/')) {
        const endpoint = url.split('/youtubei/v1/')[1]?.split('?')[0];

        if (endpoint === 'next' || endpoint === 'player' || endpoint === 'music/get_queue') {
            const clonedResponse = response.clone();
            clonedResponse.json().then(data => {
                window.postMessage({
                    type: 'YTM_API_RESPONSE',
                    endpoint: endpoint,
                    data: data
                }, '*');
            }).catch(() => { });
        }
    }

    return response;
};

const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    return originalXHROpen.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function (...args) {
    if (this._url && this._url.includes('/youtubei/v1/')) {
        const endpoint = this._url.split('/youtubei/v1/')[1]?.split('?')[0];

        if (endpoint === 'next' || endpoint === 'player' || endpoint === 'music/get_queue') {
            this.addEventListener('load', function () {
                try {
                    const data = JSON.parse(this.responseText);
                    window.postMessage({
                        type: 'YTM_API_RESPONSE',
                        endpoint: endpoint,
                        data: data
                    }, '*');
                } catch (e) { }
            });
        }
    }
    return originalXHRSend.call(this, ...args);
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
            const items = Array.from(queuePanel.querySelectorAll('ytmusic-player-queue-item'));

            if (items.length > 0) {
                let currentIndex = -1;

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const trackData = extractTrackFromQueueItem(item);

                    if (trackData) {
                        const titleMatch = trackData.nextTitle === nowPlayingTitle;
                        const artistMatch = trackData.nextArtist === nowPlayingArtist;

                        if (titleMatch && artistMatch) {
                            currentIndex = i;
                            break;
                        }
                    }
                }

                if (currentIndex === -1) {
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        const trackData = extractTrackFromQueueItem(item);

                        if (trackData && trackData.nextTitle === nowPlayingTitle) {
                            currentIndex = i;
                            break;
                        }
                    }
                }

                if (currentIndex === -1) {
                    currentIndex = 0;
                }

                function isVideoOrClip(title) {
                    if (!title) return false;
                    const lowerTitle = title.toLowerCase();
                    return lowerTitle.includes('clipe oficial') ||
                        lowerTitle.includes('official video') ||
                        lowerTitle.includes('music video') ||
                        lowerTitle.includes('(clipe') ||
                        lowerTitle.includes('(official') ||
                        lowerTitle.includes('(video') ||
                        lowerTitle.includes('[video') ||
                        lowerTitle.includes('[clipe');
                }

                let nextIndex = currentIndex + 1;
                let nextData = null;

                for (let i = nextIndex; i < Math.min(nextIndex + 5, items.length); i++) {
                    items[i].scrollIntoView({ behavior: 'instant', block: 'nearest' });
                }

                while (nextIndex < items.length) {
                    const candidateItem = items[nextIndex];
                    const shouldDebug = (nextIndex - currentIndex) <= 3;
                    const candidateData = extractTrackFromQueueItem(candidateItem, shouldDebug);

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

                        if (isDuplicate || isVideoOrClip(candidateData.nextTitle)) {
                        } else {
                            nextData = candidateData;

                            if (nextData.nextArt && nextData.nextArt.startsWith('data:image/')) {
                                nextData.nextArt = '';
                            }

                            break;
                        }
                    }
                    nextIndex++;
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
        const img = item.querySelector('yt-img-shadow img, img');
        const title = item.querySelector('.song-title, .title');
        const artist = item.querySelector('.byline, .secondary-flex-columns');

        const badges = item.querySelectorAll('[class*="badge"], [class*="icon"], [class*="overlay"]');
        const hasPlayButton = badges.length >= 10;

        if (title && hasPlayButton) {
            return {
                nextTitle: title.textContent?.trim() || '',
                nextArtist: artist?.textContent?.split('•')[0]?.trim() || '',
                nextArt: img?.src || ''
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

    const observer = new MutationObserver(() => {
        extractNextTrackFromPlayer();
    });

    observer.observe(playerBar, {
        subtree: true,
        attributes: true,
        childList: true
    });

    const video = document.querySelector('video');
    if (video) {
        video.addEventListener('play', () => {
            setTimeout(extractNextTrackFromPlayer, 500);
        });
        video.addEventListener('loadeddata', () => {
            setTimeout(extractNextTrackFromPlayer, 500);
        });
    }
}

observePlayerChanges();
