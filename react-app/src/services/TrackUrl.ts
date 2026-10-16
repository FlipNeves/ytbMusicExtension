/**
 * TrackUrl - Links de faixas do YouTube Music
 *
 * Funções puras, usadas pelo content script (compartilhar) e pelo background
 * (reabrir a última música, reconhecer a janela restaurada).
 */

const TRACK_URL_BASE = 'https://music.youtube.com/watch';

/** Extrai o id de uma URL do tipo .../watch?v=ID; null se não houver */
export const getVideoIdFromUrl = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        if (!parsed.pathname.endsWith('/watch')) return null;
        return parsed.searchParams.get('v') || null;
    } catch {
        return null;
    }
};

/** O que um link do YTM permite colocar na fila: uma faixa ou uma playlist */
export type QueueTarget = { videoId: string } | { playlistId: string };

/**
 * Alvo de "Tocar a seguir" para um link: /watch vira a faixa (a fila do link
 * é ignorada), /playlist vira a playlist; páginas de álbum/artista não entram.
 */
export const getQueueTarget = (url: string): QueueTarget | null => {
    try {
        const parsed = new URL(url);
        const videoId = parsed.pathname.endsWith('/watch') ? parsed.searchParams.get('v') : null;
        if (videoId) return { videoId };

        const playlistId = parsed.pathname.endsWith('/playlist') ? parsed.searchParams.get('list') : null;
        return playlistId ? { playlistId } : null;
    } catch {
        return null;
    }
};

/** Link canônico da faixa; a fila (list) só entra quando pedida */
export const buildTrackUrl = (videoId: string, playlistId?: string | null): string => {
    const params = new URLSearchParams({ v: videoId });
    if (playlistId) {
        params.set('list', playlistId);
    }
    return `${TRACK_URL_BASE}?${params}`;
};
