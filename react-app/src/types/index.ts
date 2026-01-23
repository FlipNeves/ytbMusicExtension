/**
 * Central type exports for the YTM Player Extension
 * 
 * @module types
 */

// Song types
export type { SongInfo, UpNextInfo } from './song';
export { DEFAULT_SONG_INFO, DEFAULT_UP_NEXT_INFO } from './song';

// Player types
export type { PlayerState, PlayerControls } from './player';
export { DEFAULT_PLAYER_STATE } from './player';

// Lyrics types
export type { LyricLine, LyricsResult, LyricsApiResponse, LyricsProps } from './lyrics';

// Time types
export type { TimeState, TimeStateListener } from './time';
export { DEFAULT_TIME_STATE } from './time';

// Common types
export type { RGB } from './common';
