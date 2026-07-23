/**
 * QueueService - Leitura da fila de reprodução do YouTube Music
 *
 * O painel ytmusic-player-queue fica no DOM da página do player; o content
 * script compartilha o DOM, então dá para ler a fila diretamente (a mesma
 * heurística de "item atual" usada pelo interceptor: atributo `selected`
 * ou `play-button-state`).
 */

export interface QueueTrack {
    /** Título da faixa */
    title: string;
    /** Artista (primeiro segmento do byline) */
    artist: string;
    /** Item original da fila (clicado para tocar a faixa) */
    element: HTMLElement;
    /** Se o item é a versão em vídeo (thumbnail 16:9 do i.ytimg.com) */
    isVideo: boolean;
}

const getQueueItems = (): HTMLElement[] => {
    const queue = document.querySelector('ytmusic-player-queue');
    if (!queue) return [];
    return Array.from(queue.querySelectorAll<HTMLElement>('ytmusic-player-queue-item'));
};

const findCurrentIndex = (items: HTMLElement[]): number => {
    const bySelected = items.findIndex((item) => item.hasAttribute('selected'));
    if (bySelected !== -1) return bySelected;

    return items.findIndex((item) => {
        const state = item.getAttribute('play-button-state');
        return state === 'playing' || state === 'loading' || state === 'paused';
    });
};

/**
 * Remove duplicatas de "counterpart" (mesma faixa nas versões música e vídeo).
 *
 * O YTM coloca as duas versões na fila com o mesmo título/artista; mantemos
 * uma só, preferindo a versão música quando as duas existirem. A ordem da
 * primeira ocorrência é preservada.
 */
export const dedupeCounterparts = <T extends { title: string; artist: string; isVideo: boolean }>(
    tracks: T[]
): T[] => {
    const byKey = new Map<string, T>();
    const order: string[] = [];

    for (const track of tracks) {
        const key = `${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
        const existing = byKey.get(key);

        if (!existing) {
            byKey.set(key, track);
            order.push(key);
            continue;
        }
        if (existing.isVideo && !track.isVideo) {
            byKey.set(key, track);
        }
    }

    return order.map((key) => byKey.get(key)!);
};

/** Thumbnails de vídeo vêm do i.ytimg.com; capas de áudio, do googleusercontent */
const isVideoThumbnail = (item: HTMLElement): boolean => {
    const thumb = item.querySelector<HTMLImageElement>('img');
    if (!thumb?.src) return false;
    return /i\.ytimg\.com|\/vi\//.test(thumb.src);
};

/**
 * Retorna as próximas faixas da fila, a partir da atual,
 * sem as duplicatas música/vídeo
 */
export const getUpcomingTracks = (limit = 20): QueueTrack[] => {
    const items = getQueueItems();
    if (items.length === 0) return [];

    const currentIndex = findCurrentIndex(items);
    const upcoming = items.slice(currentIndex + 1);

    const tracks = upcoming
        .map((item) => ({
            title: item.querySelector('.song-title, .title')?.textContent?.trim() || '',
            artist: item.querySelector('.byline')?.textContent?.split('•')[0]?.trim() || '',
            element: item,
            isVideo: isVideoThumbnail(item),
        }))
        .filter((track) => track.title);

    return dedupeCounterparts(tracks).slice(0, limit);
};

/**
 * Toca uma faixa da fila clicando no item original
 */
export const playQueueTrack = (track: QueueTrack): void => {
    if (!track.element.isConnected) return;
    const playButton = track.element.querySelector<HTMLElement>('ytmusic-play-button-renderer');
    (playButton || track.element).click();
};
