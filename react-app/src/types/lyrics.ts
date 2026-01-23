/**
 * Lyrics-related type definitions
 */

/**
 * A single synchronized lyric line
 */
export interface LyricLine {
    /** Time in seconds when this line should be displayed */
    time: number;
    /** The lyric text */
    text: string;
}

/**
 * Result from lyrics fetch operations
 */
export interface LyricsResult {
    /** Synchronized lyrics (parsed LRC format) */
    syncedLyrics: LyricLine[];
    /** Plain text lyrics (fallback when synced not available) */
    plainLyrics: string | null;
}

/**
 * Response from lrclib.net API
 */
export interface LyricsApiResponse {
    /** Raw synced lyrics in LRC format */
    syncedLyrics?: string;
    /** Plain text lyrics */
    plainLyrics?: string;
}

/**
 * Lyrics component props
 */
export interface LyricsProps {
    /** Song title */
    title: string;
    /** Artist name */
    artist: string;
    /** Whether lyrics panel is visible */
    isVisible: boolean;
    /** Current playback time in seconds */
    currentTime?: number;
    /** Song duration in seconds */
    duration?: number;
}
