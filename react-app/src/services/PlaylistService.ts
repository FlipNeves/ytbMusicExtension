/**
 * PlaylistService - Extração das playlists do menu lateral do YouTube Music
 *
 * O guide completo (#guide-renderer) permanece no DOM mesmo recolhido, então
 * as playlists são lidas sem expandir o menu. As entradas normalmente não têm
 * <a href>: a navegação SPA acontece clicando no tp-yt-paper-item interno.
 */

export interface SidebarPlaylist {
    /** Nome da playlist (ou "Nova playlist") */
    title: string;
    /** Linha secundária (ex.: autor ou tipo), quando existir */
    subtitle: string;
    /** Href relativo, quando a entrada tiver âncora */
    href: string | null;
    /** Elemento clicável original no guide (mantém a navegação SPA) */
    element: HTMLElement;
}

const isPlaylistHref = (href: string): boolean =>
    href.includes('playlist?list=') || /\/browse\/(VL|MPSP)/.test(href);

/**
 * Coleta as entradas de playlist do guide completo do YouTube Music.
 * Retorna também a entrada "Nova playlist" (clicável) quando presente.
 */
export const getSidebarPlaylists = (): SidebarPlaylist[] => {
    // #guide-renderer é o guide completo; #mini-guide-renderer é o rail recolhido
    const guide = document.querySelector('ytmusic-guide-renderer#guide-renderer')
        || document.querySelector('#guide-renderer');
    if (!guide) return [];

    const seen = new Set<string>();
    const playlists: SidebarPlaylist[] = [];

    const sections = guide.querySelectorAll('ytmusic-guide-section-renderer');
    sections.forEach((section) => {
        const isPrimary = section.hasAttribute('is-primary');
        const entries = section.querySelectorAll('ytmusic-guide-entry-renderer');

        entries.forEach((entry) => {
            const anchor = entry.querySelector<HTMLAnchorElement>('a');
            const href = anchor?.getAttribute('href') || null;

            // Na seção primária (Início/Explorar/Biblioteca) só aceitamos
            // entradas com href de playlist; nas demais seções, tudo é
            // playlist ou "Nova playlist".
            if (isPrimary && !(href && isPlaylistHref(href))) return;

            const title = (
                entry.querySelector('.title')?.textContent ||
                entry.textContent ||
                ''
            ).replace(/\s+/g, ' ').trim();
            if (!title) return;

            const subtitle = entry.querySelector('.subtitle, .byline')?.textContent
                ?.replace(/\s+/g, ' ').trim() || '';

            const key = href || title;
            if (seen.has(key)) return;
            seen.add(key);

            const clickable = anchor
                || entry.querySelector<HTMLElement>('tp-yt-paper-item')
                || (entry as HTMLElement);

            playlists.push({ title: title.slice(0, 80), subtitle, href, element: clickable });
        });
    });

    return playlists;
};

/**
 * Navega para uma playlist preservando a navegação SPA quando possível
 */
export const openSidebarPlaylist = (playlist: SidebarPlaylist): void => {
    if (playlist.element.isConnected) {
        playlist.element.click();
        return;
    }
    if (playlist.href) {
        window.location.href = playlist.href;
    }
};
