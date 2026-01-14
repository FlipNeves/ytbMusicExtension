import { useState, useEffect, useCallback, useRef } from "react";



const extractColor = (
  imgSrc: string
): Promise<{ r: number; g: number; b: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgSrc;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Could not get canvas context");
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        resolve({ r, g, b });
      } catch {
        resolve({ r: 255, g: 0, b: 0 });
      }
    };
    img.onerror = () => resolve({ r: 255, g: 0, b: 0 });
  });
};

const adjustColorBrightness = (colorObj: {
  r: number;
  g: number;
  b: number;
}) => {
  let { r, g, b } = colorObj;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness < 60) {
    const factor = 1.5;
    r = Math.min(255, r * factor + 50);
    g = Math.min(255, g * factor + 50);
    b = Math.min(255, b * factor + 50);
  }
  return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
};

export const useYTMObserver = () => {
  const [songInfo, setSongInfo] = useState({
    albumArt: "",
    title: "Música",
    artist: "Artista",
    currentTime: "0:00",
    totalTime: "0:00",
    progress: 0,
    duration: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(50);
  const [isLiked, setIsLiked] = useState(false);
  const [upNextInfo, setUpNextInfo] = useState({
    nextTitle: "...",
    nextArtist: "...",
  });

  const lastAlbumArtRef = useRef("");
  const lastSongIdRef = useRef("");
  const songChangePendingRef = useRef(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'YTM_NEXT_TRACK_DOM') {
        const data = event.data.data;
        setUpNextInfo({
          nextTitle: data.nextTitle || '...',
          nextArtist: data.nextArtist || '...',
        });
        return;
      }

      if (event.data.type === 'YTM_API_RESPONSE') {
        const { endpoint, data } = event.data;

        try {
          let nextTrack = null;

          interface PlaylistItem {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            playlistPanelVideoRenderer: any;
          }

          type Tab = {
            tabRenderer?: {
              content?: {
                musicQueueRenderer?: {
                  content: {
                    playlistPanelRenderer: {
                      contents: PlaylistItem[];
                    }
                  }
                }
              }
            }
          };

          if (endpoint === 'next' || endpoint === 'player') {
            if (data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs) {
              const tabs = data.contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer.watchNextTabbedResultsRenderer.tabs;
              const queueTab = tabs.find((tab: Tab) => tab.tabRenderer?.content?.musicQueueRenderer);

              if (queueTab) {
                const queueItems = queueTab.tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents;
                if (queueItems && queueItems.length > 1) {
                  nextTrack = queueItems[1].playlistPanelVideoRenderer;
                }
              }
            }

            if (!nextTrack && data?.continuationContents?.playlistPanelContinuation?.contents) {
              const items = data.continuationContents.playlistPanelContinuation.contents;
              if (items && items.length > 0) {
                nextTrack = items[0].playlistPanelVideoRenderer;
              }
            }

          }

          if (endpoint === 'music/get_queue' && data?.queueDatas) {
            const queueItems = data.queueDatas;
            if (queueItems && queueItems.length > 1) {
              const nextQueueData = queueItems[1];
              if (nextQueueData.content) {
                nextTrack = nextQueueData.content.playlistPanelVideoRenderer;
              }
            }
          }

          if (nextTrack) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const track = nextTrack as any;
            const title = track.title?.runs?.[0]?.text || track.title?.simpleText || 'Título desconhecido';
            const artist = track.longBylineText?.runs?.[0]?.text ||
              track.shortBylineText?.runs?.[0]?.text || 'Artista desconhecido';

            setUpNextInfo({
              nextTitle: title,
              nextArtist: artist,
            });
          }
        } catch {
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const syncPlayerState = useCallback(async () => {
    const titleEl = document.querySelector('.content-info-wrapper .title');
    const artistEl = document.querySelector('.content-info-wrapper .byline');
    const newTitle = titleEl?.textContent || 'Música';
    const newArtist = artistEl?.textContent?.split('•')[0].trim() || 'Artista';
    const songId = `${newTitle}-${newArtist}`;

    const songChanged = songId !== lastSongIdRef.current && lastSongIdRef.current !== '';

    if (songChanged) {
      lastSongIdRef.current = songId;
      songChangePendingRef.current = false;

      setSongInfo({
        albumArt: '',
        title: newTitle,
        artist: newArtist,
        currentTime: '0:00',
        totalTime: '0:00',
        progress: 0,
        duration: 0,
      });
    }

    if (lastSongIdRef.current === '') {
      lastSongIdRef.current = songId;
    }

    const artEl = document.querySelector<HTMLImageElement>('.thumbnail-image-wrapper img');
    let newSrc = '';
    if (artEl) {
      newSrc = artEl.src;
      if (newSrc.includes('googleusercontent.com')) {
        newSrc = newSrc.replace(/w\d+-h\d+/, 'w1200-h1200');
      }
      if (newSrc !== lastAlbumArtRef.current) {
        lastAlbumArtRef.current = newSrc;
        document.documentElement.style.setProperty('--ytm-album-art-url', `url('${newSrc}')`);
        const color = await extractColor(newSrc);
        const finalColor = adjustColorBrightness(color);
        document.documentElement.style.setProperty('--ytm-focus-accent', finalColor);
        document.documentElement.style.setProperty('--minha-cor-tema', finalColor);
      }
    }

    const timeInfoEl = document.querySelector('ytmusic-player-bar .time-info');
    const progressBarEl = document.querySelector('ytmusic-player-bar #progress-bar');

    let currentTimeStr = '0:00';
    let totalTimeStr = '0:00';
    let progress = 0;

    if (timeInfoEl && !songChanged) {
      const timeText = timeInfoEl.textContent || '';
      const parts = timeText.split(' / ').map(s => s.trim());
      currentTimeStr = parts[0] || '0:00';
      totalTimeStr = parts[1] || '0:00';
    }

    if (progressBarEl && !songChanged) {
      const value = parseFloat(progressBarEl.getAttribute('aria-valuenow') || '0');
      const max = parseFloat(progressBarEl.getAttribute('aria-valuemax') || '100');
      progress = max > 0 ? (value / max) * 100 : 0;
    }

    const video = document.querySelector('video');

    setSongInfo(info => ({
      ...info,
      albumArt: newSrc,
      title: newTitle,
      artist: newArtist,
      currentTime: songChanged ? '0:00' : currentTimeStr,
      totalTime: totalTimeStr,
      progress: songChanged ? 0 : progress,
    }));
    setIsPlaying(video ? !video.paused : false);

  }, []);

  const updateTime = useCallback(() => {
    const timeInfoEl = document.querySelector('ytmusic-player-bar .time-info');
    const progressBarEl = document.querySelector('ytmusic-player-bar #progress-bar');
    const video = document.querySelector('video') as HTMLVideoElement;

    if (timeInfoEl) {
      const timeText = timeInfoEl.textContent || '';
      const [currentTimeStr, totalTimeStr] = timeText.split(' / ').map(s => s.trim());

      let progress = 0;
      let durationSec = 0;
      if (progressBarEl) {
        const value = parseFloat(progressBarEl.getAttribute('aria-valuenow') || '0');
        const max = parseFloat(progressBarEl.getAttribute('aria-valuemax') || '100');
        durationSec = max;
        progress = max > 0 ? (value / max) * 100 : 0;
      }

      if (video && video.duration && !isNaN(video.duration)) {
        durationSec = video.duration;
      }

      setSongInfo(info => ({
        ...info,
        currentTime: currentTimeStr || info.currentTime,
        totalTime: totalTimeStr || info.totalTime,
        progress: progress,
        duration: durationSec,
      }));
    }
  }, []);

  useEffect(() => {
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (!playerBar) return;

    const observer = new MutationObserver(() => {
      setTimeout(() => syncPlayerState(), 50);
    });
    observer.observe(playerBar, { subtree: true, attributes: true, childList: true });

    const handleEnded = () => {
      songChangePendingRef.current = true;
    };

    const bindVideo = () => {
      const video = document.querySelector('video');
      if (video && !video.dataset.focusModeBound) {
        video.dataset.focusModeBound = 'true';
        video.addEventListener('play', syncPlayerState);
        video.addEventListener('pause', syncPlayerState);
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadeddata', syncPlayerState);
        video.addEventListener('ended', handleEnded);
      }
    }

    const videoInterval = setInterval(bindVideo, 1000);

    return () => {
      observer.disconnect();
      clearInterval(videoInterval);
      const video = document.querySelector('video');
      if (video) {
        video.removeEventListener('play', syncPlayerState);
        video.removeEventListener('pause', syncPlayerState);
        video.removeEventListener('timeupdate', updateTime);
        video.removeEventListener('loadeddata', syncPlayerState);
        video.removeEventListener('ended', handleEnded);
      }
    }
  }, [syncPlayerState, updateTime]);

  const setVolume = useCallback((value: number) => {
    window.postMessage({ type: 'YTM_SET_VOLUME', value: value }, '*');
    setVolumeState(value);
  }, []);

  const seekTo = useCallback((timeInSeconds: number) => {
    window.postMessage({ type: 'YTM_SEEK', time: timeInSeconds }, '*');
  }, []);

  const toggleLike = useCallback(() => {
    const likeBtn = document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button') as HTMLElement;
    if (likeBtn) {
      likeBtn.click();
      setTimeout(() => {
        const updatedBtn = document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button');
        const isNowLiked = updatedBtn?.getAttribute('aria-pressed') === 'true';
        setIsLiked(isNowLiked);
      }, 200);
    }
  }, []);

  useEffect(() => {
    const syncVolumeAndLike = () => {
      const volumeSlider = document.querySelector('ytmusic-player-bar #volume-slider') as any;
      if (volumeSlider && typeof volumeSlider.value === 'number') {
        setVolumeState(volumeSlider.value);
      } else {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          setVolumeState(Math.round(Math.sqrt(video.volume) * 100));
        }
      }

      const likeBtn = document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button');
      if (likeBtn) {
        setIsLiked(likeBtn.getAttribute('aria-pressed') === 'true');
      }
    };

    syncVolumeAndLike();
    const interval = setInterval(syncVolumeAndLike, 500);
    return () => clearInterval(interval);
  }, []);

  return { songInfo, isPlaying, upNextInfo, volume, isLiked, setVolume, toggleLike, seekTo };
};

