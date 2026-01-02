import { useState, useEffect, useCallback, useRef } from "react";

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

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
      } catch (e) {
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
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [upNextInfo, setUpNextInfo] = useState({
    nextArt: "",
    nextTitle: "...",
    nextArtist: "...",
  });

  const lastAlbumArtRef = useRef("");
  const lastSongIdRef = useRef("");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'YTM_NEXT_TRACK_DOM') {
        const data = event.data.data;
        setUpNextInfo({
          nextTitle: data.nextTitle || '...',
          nextArtist: data.nextArtist || '...',
          nextArt: data.nextArt || '',
        });
        return;
      }

      if (event.data.type === 'YTM_API_RESPONSE') {
        const { endpoint, data } = event.data;

        try {
          let nextTrack = null;

          if (endpoint === 'next' || endpoint === 'player') {
            if (data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs) {
              const tabs = data.contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer.watchNextTabbedResultsRenderer.tabs;
              const queueTab = tabs.find((tab: any) => tab.tabRenderer?.content?.musicQueueRenderer);

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

            if (!nextTrack && data?.playerResponse) {
              const pr = data.playerResponse;
              if (pr.videoDetails) {
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
            const title = nextTrack.title?.runs?.[0]?.text || nextTrack.title?.simpleText || 'Título desconhecido';
            const artist = nextTrack.longBylineText?.runs?.[0]?.text ||
              nextTrack.shortBylineText?.runs?.[0]?.text || 'Artista desconhecido';
            const thumbnails = nextTrack.thumbnail?.thumbnails || [];
            const art = thumbnails.length > 0 ?
              thumbnails[thumbnails.length - 1].url : '';

            setUpNextInfo({
              nextTitle: title,
              nextArtist: artist,
              nextArt: art,
            });
          }
        } catch (e) {
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const syncPlayerState = useCallback(async () => {
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

    const titleEl = document.querySelector('.content-info-wrapper .title');
    const artistEl = document.querySelector('.content-info-wrapper .byline');
    const newTitle = titleEl?.textContent || 'Música';
    const newArtist = artistEl?.textContent?.split('•')[0].trim() || 'Artista';
    const songId = `${newTitle}-${newArtist}`;

    const video = document.querySelector('video');
    let curr = video?.currentTime || 0;
    const total = video?.duration || 0;

    if (songId !== lastSongIdRef.current && lastSongIdRef.current !== '') {
      curr = 0;
    }
    lastSongIdRef.current = songId;

    setSongInfo(info => ({
      ...info,
      albumArt: newSrc,
      title: newTitle,
      artist: newArtist,
      currentTime: formatTime(curr),
      totalTime: formatTime(total),
      progress: total > 0 ? (curr / total) * 100 : 0,
    }));

    setIsPlaying(video ? !video.paused : false);

  }, []);

  const updateTime = useCallback(() => {
    const video = document.querySelector('video');
    if (video) {
      const curr = video.currentTime;
      const total = video.duration || 0;
      setSongInfo(info => ({
        ...info,
        currentTime: formatTime(curr),
        totalTime: formatTime(total),
        progress: total > 0 ? (curr / total) * 100 : 0,
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

    const bindVideo = () => {
      const video = document.querySelector('video');
      if (video && !video.dataset.focusModeBound) {
        video.dataset.focusModeBound = 'true';
        video.addEventListener('play', syncPlayerState);
        video.addEventListener('pause', syncPlayerState);
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadeddata', syncPlayerState);
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
      }
    }
  }, [syncPlayerState, updateTime]);

  return { songInfo, isPlaying, upNextInfo };
};
