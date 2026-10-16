/**
 * NavigationService - Navegação para páginas do YouTube Music
 */

import { SELECTORS } from '../constants';

/**
 * Abre a página do artista da música atual.
 *
 * O byline da barra do player contém âncoras para o(s) artista(s)
 * (href com "channel/"). Clicar nelas preserva a navegação SPA.
 * Fallback: busca pelo nome do artista.
 */
export const openCurrentArtistPage = (artistName: string): void => {
    const anchors = document.querySelectorAll<HTMLAnchorElement>(SELECTORS.ARTIST_LINKS);

    for (const anchor of anchors) {
        const href = anchor.getAttribute('href') || '';
        if (href.includes('channel/')) {
            anchor.click();
            return;
        }
    }

    if (anchors.length > 0) {
        anchors[0].click();
        return;
    }

    if (artistName) {
        window.location.href = `https://music.youtube.com/search?q=${encodeURIComponent(artistName)}`;
    }
};
