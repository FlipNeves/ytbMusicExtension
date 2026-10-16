/**
 * Application Constants
 * 
 * Centralized string literals for internationalization readiness
 * and consistent messaging across the application.
 * 
 * @module constants
 */

/**
 * User-facing messages
 */
export const MESSAGES = {
    // Lyrics
    LYRICS_LOADING: 'Buscando letra...',
    LYRICS_NOT_FOUND: 'Letra não encontrada',
    LYRICS_FAILED: 'Não foi possível carregar a letra. Feche e abra o painel para tentar de novo.',
    LYRICS_HEADER: 'Letra',
    SYNC_ON: 'Sync On',
    SYNC_OFF: 'Sync Off',

    // Player
    LINK_COPIED: 'Link copiado!',
    COPY_FAILED: 'Falha ao copiar link',
    LINK_UNAVAILABLE: 'Não foi possível identificar a música',
    FOCUS_MODE: 'Modo Foco',

    // Song defaults
    DEFAULT_TITLE: 'Música',
    DEFAULT_ARTIST: 'Artista',
    UNKNOWN_TITLE: 'Título desconhecido',
    UNKNOWN_ARTIST: 'Artista desconhecido',

    // Controls
    PLAY: 'Reproduzir',
    PAUSE: 'Pausar',
    NEXT: 'Próxima',
    PREVIOUS: 'Anterior',
    LIKE: 'Curtir',
    UNLIKE: 'Remover curtida',
    SHARE: 'Compartilhar',
    CLOSE: 'Fechar',

    // Up Next
    UP_NEXT: 'A seguir',

    // Sessions
    SESSION_PROMPT_TITLE: 'Você já tem uma sessão em andamento',
    SESSION_PROMPT_QUESTION: 'O que deseja fazer com o novo link?',
    SESSION_NOW_PLAYING: 'está tocando agora.',
    SESSION_PLAY_NEXT: 'Tocar a seguir nesta sessão',
    SESSION_OPEN_NEW: 'Abrir em nova sessão',
    SESSION_REPLACE: 'Substituir sessão atual',
    SESSION_CANCEL: 'Cancelar',
    QUEUE_FAILED: 'Não foi possível colocar na fila — abra o link em uma sessão',
    SESSIONS_TITLE: 'Sessões',
    SESSION_NEW: 'Nova sessão',
    SESSION_CURRENT: 'atual',

    // PIX Donation
    PIX_TITLE: 'Me pague um café ☕',
    PIX_DESCRIPTION: 'Escaneie o QR Code ou copie o código PIX',
    PIX_COPY: 'Copiar',
    PIX_COPIED: '✓ Copiado!',
    PIX_THANKS: 'Obrigado pelo apoio! 🎵',
    PIX_CODE_LABEL: 'Código PIX Copia e Cola',
} as const;

/**
 * Accessibility labels (aria-label)
 */
export const A11Y = {
    // Controls
    PLAY_MUSIC: 'Reproduzir música',
    PAUSE_MUSIC: 'Pausar música',
    NEXT_MUSIC: 'Próxima música',
    PREV_MUSIC: 'Música anterior',
    SHOW_LYRICS: 'Mostrar letra da música',
    HIDE_LYRICS: 'Ocultar letra da música',

    // Player
    SHARE_LINK: 'Compartilhar link da música',
    LIKE_MUSIC: 'Curtir música',
    UNLIKE_MUSIC: 'Remover curtida da música',
    PROGRESS: 'Progresso da música',

    // Focus Mode
    CLOSE_FOCUS: 'Fechar modo foco',

    // Sessions
    SESSIONS_MENU: 'Sessões abertas',
    SESSION_SWITCH: 'Ir para a sessão',
    SESSION_CLOSE: 'Encerrar sessão',
    SESSION_CREATE: 'Abrir nova sessão',

    // PIX
    OPEN_PIX: 'Abrir modal de doação PIX',
    CLOSE_PIX: 'Fechar modal de doação',
    COPY_PIX: 'Copiar código PIX',
} as const;

/**
 * Seletores do YouTube Music — fonte única do content script.
 *
 * O YTM muda o DOM sem aviso; os listados em CRITICAL_SELECTORS são
 * verificados em execução (YTMHealth) e avisam no console quando somem.
 * O interceptor.js roda no mundo da página, não importa módulos e mantém
 * as próprias cópias dos que usa.
 */
export const SELECTORS = {
    // Player bar: faixa atual e controles
    PLAYER_BAR: 'ytmusic-player-bar',
    TITLE: '.content-info-wrapper .title',
    ARTIST: '.content-info-wrapper .byline',
    ARTIST_LINKS: 'ytmusic-player-bar .content-info-wrapper .byline a',
    ALBUM_ART: '.thumbnail-image-wrapper img',
    TIME_INFO: 'ytmusic-player-bar .time-info',
    PROGRESS_BAR: 'ytmusic-player-bar #progress-bar',
    PLAY_PAUSE: '#play-pause-button',
    NEXT: '.next-button',
    PREVIOUS: '.previous-button',
    VOLUME_SLIDER: 'ytmusic-player-bar #volume-slider',
    LIKE_BUTTON: 'ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button',
    RIGHT_CONTROLS: '.right-controls-buttons',
    PLAYER_PAGE_TOGGLE: 'ytmusic-player-bar .toggle-player-page-button',
    VIDEO: 'video',

    // Player page e modo vídeo
    APP_LAYOUT: 'ytmusic-app-layout',
    PLAYER: 'ytmusic-player',
    PLAYER_VIDEO: 'ytmusic-player video',
    PLAYER_PAGE: 'ytmusic-player-page',
    SONG_IMAGE: 'ytmusic-player #song-image',
    AV_TOGGLE: 'ytmusic-av-toggle',

    // Fila
    QUEUE: 'ytmusic-player-queue',
    QUEUE_ITEM: 'ytmusic-player-queue-item',
    QUEUE_ITEM_TITLE: '.song-title, .title',
    QUEUE_ITEM_BYLINE: '.byline',
    QUEUE_ITEM_PLAY: 'ytmusic-play-button-renderer',

    // Navegação e menu lateral
    NAV_BAR: 'ytmusic-nav-bar',
    NAV_LEFT: 'ytmusic-nav-bar .left-content',
    GUIDE_DRAWER: 'tp-yt-app-drawer#guide',
    GUIDE_TOGGLE: 'ytmusic-nav-bar yt-icon-button#guide-button button, ytmusic-nav-bar yt-icon-button#guide-button',
    GUIDE: 'ytmusic-guide-renderer#guide-renderer, #guide-renderer',
    /** Itens da seção principal do rail recolhido (abaixo de "Biblioteca") */
    MINI_GUIDE_PRIMARY_ITEMS: '#mini-guide-renderer ytmusic-guide-section-renderer[is-primary] #items',
    MINI_GUIDE_ITEMS: '#mini-guide-renderer #items',
} as const;

export type SelectorName = keyof typeof SELECTORS;

/** Sem estes, o modo foco não funciona: o YTMHealth avisa quando somem */
export const CRITICAL_SELECTORS: readonly SelectorName[] = [
    'TITLE',
    'ARTIST',
    'TIME_INFO',
    'PROGRESS_BAR',
    'PLAY_PAUSE',
    'NEXT',
    'PREVIOUS',
    'VOLUME_SLIDER',
    'LIKE_BUTTON',
    'RIGHT_CONTROLS',
];

/**
 * Vermelho da marca na versão legível sobre fundo escuro: destaque do modo foco
 * quando a capa não pode ser lida. Espelha --fmp-brand-text.
 */
export const BRAND_COLOR = '#FF4D5E';

/**
 * Timing constants (in milliseconds)
 */
export const TIMING = {
    DEBOUNCE_SONG_CHANGE: 500,
    THROTTLE_TIME_UPDATE: 250,
    TOAST_DURATION: 2000,
    RETRY_INTERVAL: 1000,
    MESSAGE_TIMEOUT: 500,
} as const;

/**
 * Cache limits
 */
export const LIMITS = {
    MAX_LYRICS_CACHE: 50,
} as const;
