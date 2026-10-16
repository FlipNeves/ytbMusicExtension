/**
 * Session types - Multiple listening sessions support
 *
 * A "session" is a dedicated YTM window with its own player, queue and
 * playback position. The background service worker keeps a registry of
 * session windows; content scripts talk to it via runtime messages.
 *
 * The content script is built separately (IIFE), so modules can be shared
 * with the background; this one stays type-only because it only describes
 * the message protocol, enforced by the SessionRuntimeMessage union below.
 *
 * @module types/sessions
 */

/** What to do with an incoming external link */
export type SessionDecision = 'new' | 'replace' | 'queue' | 'cancel';

/** What a session is playing, reported so it can be reopened on startup */
export interface SessionPlayback {
    videoId: string;
    /** Queue/playlist being played (e.g. a radio RDAMVM...) */
    playlistId: string | null;
    /** Position in seconds */
    time: number;
    title: string;
}

/** Position to resume (paused) in a session reopened on browser startup */
export interface SessionRestore {
    videoId: string;
    time: number;
}

/**
 * Runtime messages exchanged between background and content scripts.
 * Consumers use the string literals directly; typos are caught by this union.
 */
export type SessionRuntimeMessage =
    /** background -> content: an external YTM link arrived while this session is active */
    | { type: 'SESSION_INCOMING_LINK'; url: string }
    /** content -> background: user's (or automatic) decision for a pending link */
    | { type: 'SESSION_DECISION'; url: string; decision: SessionDecision }
    /** background -> content: pause playback in this session */
    | { type: 'SESSION_PAUSE' }
    /** content -> background: list current sessions */
    | { type: 'SESSIONS_GET' }
    /** content -> background: focus another session window */
    | { type: 'SESSION_ACTIVATE'; windowId: number }
    /** content -> background: close a session window */
    | { type: 'SESSION_CLOSE'; windowId: number }
    /** content -> background: open a new empty session */
    | { type: 'SESSION_NEW' }
    /** background -> content: the session registry changed (refresh the menu) */
    | { type: 'SESSIONS_CHANGED' }
    /** background -> content: keyboard shortcut to open/close focus mode */
    | { type: 'FOCUS_TOGGLE' }
    /** content -> background: what this session is playing */
    | { type: 'SESSION_PLAYBACK'; playback: SessionPlayback }
    /** content -> background: content script ready; answered with { restore?: SessionRestore } */
    | { type: 'SESSION_HELLO' };

export type SessionMessageType = SessionRuntimeMessage['type'];

/** Summary of one session window, as reported by the background */
export interface SessionSummary {
    windowId: number;
    /** Cleaned tab title (usually the playing song) */
    title: string;
    /** Session currently marked as active (last focused) */
    isActive: boolean;
    /** Session of the tab that asked for the list */
    isSelf: boolean;
}

/** Pending confirmation shown to the user before consuming a link */
export interface SessionPromptRequest {
    url: string;
    songTitle: string;
    artist: string;
    /** Single track or playlist that can be queued with "Tocar a seguir" */
    canQueue: boolean;
}
