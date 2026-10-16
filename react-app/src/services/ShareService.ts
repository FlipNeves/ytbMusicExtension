/**
 * ShareService - Link da música atual
 *
 * Single Responsibility: montar o link compartilhável da faixa que está tocando.
 *
 * O id vem do player (via interceptor). A URL da página só serve de reserva
 * quando ela é a própria /watch: fora dela (início, biblioteca, artista) a URL
 * não identifica a música, e copiá-la geraria um link genérico do YTM.
 */

import { getVideoId } from './YTMBridge';
import { buildTrackUrl, getVideoIdFromUrl } from './TrackUrl';

/**
 * Link da música que está tocando, ou null se não for possível identificá-la
 */
export const getCurrentTrackUrl = async (): Promise<string | null> => {
    const videoId = (await getVideoId()) || getVideoIdFromUrl(window.location.href);
    return videoId ? buildTrackUrl(videoId) : null;
};
