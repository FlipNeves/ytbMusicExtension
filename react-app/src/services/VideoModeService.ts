/**
 * VideoModeService - Detecção e alternância música/vídeo no YouTube Music
 *
 * Usa o ytmusic-av-toggle nativo (atributos `selected-item-has-video`,
 * `is-video-playback-mode-selected`, `toggle-disabled` e os botões
 * .song-button/.video-button). Sem o toggle nativo, o fallback é tocar o
 * counterpart da fila — isso reinicia a faixa, então o chamador deve
 * restaurar a posição via seek.
 */

import { SELECTORS } from '../constants';

export type SwitchMethod = 'av-toggle' | 'queue' | null;

const getAvToggle = (): Element | null => document.querySelector(SELECTORS.AV_TOGGLE);

/** A faixa atual tem versão em vídeo disponível? */
export const hasVideoCounterpart = (): boolean => {
    const av = getAvToggle();
    if (av?.hasAttribute('selected-item-has-video')) return true;
    return isVideoPlaybackActive();
};

/** Qual segmento do av-toggle nativo está selecionado (via aria-pressed)? */
export const getAvSelection = (): 'video' | 'audio' | null => {
    const av = getAvToggle();
    if (!av) return null;
    if (av.querySelector('.video-button')?.getAttribute('aria-pressed') === 'true') return 'video';
    if (av.querySelector('.song-button')?.getAttribute('aria-pressed') === 'true') return 'audio';
    return null;
};

/**
 * O que está tocando agora é vídeo?
 * videoWidth > 0 é o sinal físico (faixas só-áudio têm 0); sinais de DOM
 * cobrem o intervalo até o stream carregar.
 */
export const isVideoPlaybackActive = (): boolean => {
    const video = document.querySelector<HTMLVideoElement>(SELECTORS.PLAYER_VIDEO);
    if (video && video.videoWidth > 0) return true;

    const player = document.querySelector(SELECTORS.PLAYER);
    const songImage = document.querySelector(SELECTORS.SONG_IMAGE);
    if (
        player?.hasAttribute('video-mode') &&
        songImage &&
        getComputedStyle(songImage).display === 'none'
    ) {
        return true;
    }

    // Atributo Polymer pode serializar como "true" ou vazio — só "false"/ausente nega
    const av = getAvToggle();
    const attr = av?.getAttribute('is-video-playback-mode-selected');
    if (attr !== null && attr !== undefined && attr !== 'false') return true;

    return getAvSelection() === 'video';
};

const isVideoThumb = (item: Element): boolean => {
    const src = item.querySelector<HTMLImageElement>('img')?.src || '';
    return /i\.ytimg\.com|\/vi\//.test(src);
};

/** Encontra na fila o counterpart (música↔vídeo) da faixa atual */
const findQueueCounterpart = (wantVideo: boolean): HTMLElement | null => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.QUEUE_ITEM));
    const current = items.find((item) => item.hasAttribute('selected'));
    if (!current) return null;

    const title = current.querySelector(SELECTORS.QUEUE_ITEM_TITLE)?.textContent?.trim().toLowerCase();
    if (!title) return null;

    return (
        items.find(
            (item) =>
                item !== current &&
                item.querySelector(SELECTORS.QUEUE_ITEM_TITLE)?.textContent?.trim().toLowerCase() === title &&
                isVideoThumb(item) === wantVideo
        ) || null
    );
};

/**
 * Dá para ativar o modo vídeo AGORA? (já em vídeo, ou existe um caminho
 * real de troca: av-toggle habilitado ou counterpart na fila)
 */
export const canEnableVideoMode = (): boolean => {
    if (isVideoPlaybackActive()) return true;
    if (!hasVideoCounterpart()) return false;

    const av = getAvToggle();
    if (av && !av.hasAttribute('toggle-disabled')) return true;

    return !!findQueueCounterpart(true);
};

/**
 * Alterna entre música e vídeo.
 * Retorna o método usado — 'queue' reinicia a faixa (restaurar posição via seek).
 */
export const switchPlayback = (mode: 'video' | 'audio'): SwitchMethod => {
    const av = getAvToggle();
    if (av && !av.hasAttribute('toggle-disabled')) {
        const button = av.querySelector<HTMLElement>(
            mode === 'video' ? '.video-button' : '.song-button'
        );
        if (button) {
            button.click();
            return 'av-toggle';
        }
    }

    const counterpart = findQueueCounterpart(mode === 'video');
    if (counterpart) {
        (counterpart.querySelector<HTMLElement>(SELECTORS.QUEUE_ITEM_PLAY) || counterpart).click();
        return 'queue';
    }
    return null;
};

/** O player page precisa estar aberto para o <video> renderizar */
export const isPlayerPageOpen = (): boolean =>
    document.querySelector(SELECTORS.APP_LAYOUT)?.hasAttribute('player-page-open') ?? false;

export const setPlayerPageOpen = (open: boolean): void => {
    if (isPlayerPageOpen() === open) return;
    const toggle =
        document.querySelector<HTMLElement>(SELECTORS.PLAYER_PAGE_TOGGLE) ||
        document.querySelector<HTMLElement>(SELECTORS.PLAYER_BAR);
    toggle?.click();
};
