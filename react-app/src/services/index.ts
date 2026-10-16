/**
 * Services barrel export
 *
 * @module services
 */

// Color extraction and theming
export {
    extractColor,
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
    onPlayerState,
    playNext,
} from './YTMBridge';

// Share link of the current track
export { getCurrentTrackUrl } from './ShareService';

// Multiple listening sessions
export { sessionService } from './SessionService';

// Lyrics fetching
export {
    fetchLyrics,
    parseLRC,
    normalizeTitle,
    normalizeArtist,
    clearCache as clearLyricsCache,
    isInCache as isLyricsInCache,
    LyricsUnavailableError,
} from './LyricsService';
