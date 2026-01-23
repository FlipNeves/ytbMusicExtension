/**
 * Player-related type definitions
 */

/**
 * Current state of the player
 */
export interface PlayerState {
    /** Whether audio is currently playing */
    isPlaying: boolean;
    /** Current volume level (0-100) */
    volume: number;
    /** Whether the current song is liked */
    isLiked: boolean;
}

/**
 * Player control callbacks
 */
export interface PlayerControls {
    /** Toggle play/pause */
    playPause: () => void;
    /** Skip to next track */
    next: () => void;
    /** Go to previous track */
    prev: () => void;
    /** Set volume level (0-100) */
    setVolume: (value: number) => void;
    /** Toggle like status */
    toggleLike: () => void;
    /** Seek to a specific time in seconds */
    seekTo: (time: number) => void;
}

/**
 * Default player state
 */
export const DEFAULT_PLAYER_STATE: PlayerState = {
    isPlaying: false,
    volume: 50,
    isLiked: false,
};
