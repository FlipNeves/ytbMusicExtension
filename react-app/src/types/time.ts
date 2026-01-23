/**
 * Time state management types
 */

/**
 * Complete time state for the current song
 * This is the single source of truth for all time-related data
 */
export interface TimeState {
    /** Current playback time in display format (e.g., "1:23") */
    currentTime: string;
    /** Current playback time in seconds */
    currentTimeSec: number;
    /** Total song duration in display format (e.g., "3:45") */
    totalTime: string;
    /** Total song duration in seconds */
    duration: number;
    /** Playback progress as percentage (0-100) */
    progress: number;
}

/**
 * Callback type for time state listeners
 */
export type TimeStateListener = (state: TimeState) => void;

/**
 * Default time state values
 */
export const DEFAULT_TIME_STATE: TimeState = {
    currentTime: '0:00',
    currentTimeSec: 0,
    totalTime: '0:00',
    duration: 0,
    progress: 0,
};
