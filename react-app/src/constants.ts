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
    LYRICS_HEADER: 'Letra',
    SYNC_ON: 'Sync On',
    SYNC_OFF: 'Sync Off',

    // Player
    LINK_COPIED: 'Link copiado!',
    COPY_FAILED: 'Falha ao copiar link',

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
    SESSION_OPEN_NEW: 'Abrir em nova sessão',
    SESSION_REPLACE: 'Substituir sessão atual',
    SESSION_CANCEL: 'Cancelar',
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
 * DOM Selector constants (for reference/documentation)
 */
export const SELECTORS = {
    PLAY_PAUSE: '#play-pause-button',
    NEXT: '.next-button',
    PREVIOUS: '.previous-button',
    VOLUME_SLIDER: 'ytmusic-player-bar #volume-slider',
    LIKE_BUTTON: 'ytmusic-player-bar ytmusic-like-button-renderer #button-shape-like button',
    VIDEO: 'video',
    TIME_INFO: 'ytmusic-player-bar .time-info',
    PROGRESS_BAR: 'ytmusic-player-bar #progress-bar',
} as const;

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
