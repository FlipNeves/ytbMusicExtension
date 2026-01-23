/**
 * Services barrel export
 * 
 * @module services
 */

// Color extraction and theming
export {
    extractColor,
    adjustColorBrightness,
    applyThemeColor,
    setAlbumArtVariable,
    extractAndApplyTheme,
} from './ColorService';

// Time utilities
export { timeToSeconds, formatTime } from './TimeService';

// Centralized time state
export { timeStateService } from './TimeStateService';

// Communication with interceptor
export {
    MESSAGE_TYPES,
    setVolume,
    seekTo,
    getVideoId,
    onNextTrackUpdate,
    onApiResponse,
} from './YTMBridge';

// Lyrics fetching
export {
    fetchLyrics,
    parseLRC,
    normalizeTitle,
    normalizeArtist,
    clearCache as clearLyricsCache,
    isInCache as isLyricsInCache,
} from './LyricsService';
