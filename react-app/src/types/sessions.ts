/**
 * Session types - Multiple listening sessions support
 *
 * A "session" is a dedicated YTM window with its own player, queue and
 * playback position. The background service worker keeps a registry of
 * session windows; content scripts talk to it via runtime messages.
 *
 * IMPORTANT: this module must stay type-only. Background and content are
 * separate manifest entry points, and any runtime export shared between them
 * would be split into a common chunk — which breaks the content script, since
 * manifest content scripts are classic scripts and cannot use `import`.
 * The message protocol is enforced by the SessionRuntimeMessage union below.
 *
 * @module types/sessions
 */

/** What to do with an incoming external link */
export type SessionDecision = 'new' | 'replace' | 'cancel';

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
    | { type: 'SESSION_NEW' };

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
}
