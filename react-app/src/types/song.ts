/**
 * Song-related type definitions
 */

/**
 * Complete information about the currently playing song
 */
export interface SongInfo {
    /** URL of the album art image */
    albumArt: string;
    /** Song title */
    title: string;
    /** Artist name(s) */
    artist: string;
    /** Current playback time in display format (e.g., "1:23") */
    currentTime: string;
    /** Total song duration in display format (e.g., "3:45") */
    totalTime: string;
    /** Playback progress as percentage (0-100) */
    progress: number;
    /** Total song duration in seconds */
    duration: number;
    /** Current playback time in seconds */
    currentTimeSec: number;
}

/**
 * Information about the next track in queue
 */
export interface UpNextInfo {
    /** Title of the next song */
    nextTitle: string;
    /** Artist of the next song */
    nextArtist: string;
}

/**
 * Default values for SongInfo
 */
export const DEFAULT_SONG_INFO: SongInfo = {
    albumArt: '',
    title: 'Música',
    artist: 'Artista',
    currentTime: '0:00',
    totalTime: '0:00',
    progress: 0,
    duration: 0,
    currentTimeSec: 0,
};

/**
 * Default values for UpNextInfo
 */
export const DEFAULT_UP_NEXT_INFO: UpNextInfo = {
    nextTitle: '...',
    nextArtist: '...',
};
