/**
 * SessionService - Content-side session management
 *
 * Single Responsibility: bridge between the background session registry and
 * the React UI (confirmation prompt + sessions menu).
 *
 * The background sends SESSION_INCOMING_LINK when an external YTM link
 * arrives while this session is active. If nothing is playing the link is
 * consumed silently (replace, same as before sessions existed); otherwise a
 * prompt request is published for <SessionPrompt /> to render.
 */

import type {
    SessionDecision,
    SessionPromptRequest,
    SessionRuntimeMessage,
    SessionSummary,
} from '../types/sessions';
import { MESSAGES, SELECTORS } from '../constants';

const SONG_SELECTORS = {
    TITLE: '.content-info-wrapper .title',
    ARTIST: '.content-info-wrapper .byline',
} as const;

type PromptListener = (request: SessionPromptRequest | null) => void;

const hasRuntime = (): boolean =>
    typeof chrome !== 'undefined' && !!chrome.runtime?.id;

class SessionService {
    private listeners = new Set<PromptListener>();
    private pendingRequest: SessionPromptRequest | null = null;
    private initialized = false;
    /**
     * Contexto de extensão invalidado (a extensão foi recarregada e este
     * content script ficou órfão): para de falar com o background para não
     * gerar erros "Unchecked runtime.lastError" no painel da extensão.
     */
    private dead = false;

    /** Registra o listener de mensagens do background. Idempotente. */
    init(): void {
        if (this.initialized || !hasRuntime()) return;
        this.initialized = true;

        chrome.runtime.onMessage.addListener((message: SessionRuntimeMessage | undefined, _sender, sendResponse) => {
            if (message?.type === 'SESSION_INCOMING_LINK' && typeof message.url === 'string') {
                this.handleIncomingLink(message.url);
                sendResponse({ handled: true });
            } else if (message?.type === 'SESSION_PAUSE') {
                this.pausePlayback();
                sendResponse({ ok: true });
            }
        });
    }

    /** UI subscribe: recebe o pedido de confirmação pendente (ou null) */
    subscribe(listener: PromptListener): () => void {
        this.listeners.add(listener);
        listener(this.pendingRequest);
        return () => this.listeners.delete(listener);
    }

    /** Decisão vinda do diálogo de confirmação */
    resolvePrompt(decision: SessionDecision): void {
        if (!this.pendingRequest) return;
        const { url } = this.pendingRequest;
        this.pendingRequest = null;
        this.notify();
        this.sendDecision(url, decision);
    }

    getSessions(): Promise<SessionSummary[]> {
        return new Promise(resolve => {
            if (this.dead || !hasRuntime()) {
                resolve([]);
                return;
            }
            try {
                const message: SessionRuntimeMessage = { type: 'SESSIONS_GET' };
                chrome.runtime.sendMessage(message, response => {
                    if (chrome.runtime.lastError || !response) {
                        resolve([]);
                    } else {
                        resolve(response.sessions ?? []);
                    }
                });
            } catch {
                this.dead = true;
                resolve([]);
            }
        });
    }

    activateSession(windowId: number): void {
        this.send({ type: 'SESSION_ACTIVATE', windowId });
    }

    closeSession(windowId: number): void {
        this.send({ type: 'SESSION_CLOSE', windowId });
    }

    createSession(): void {
        this.send({ type: 'SESSION_NEW' });
    }

    private handleIncomingLink(url: string): void {
        if (!this.isPlaying()) {
            // Nada tocando: nada a perder, mantém o comportamento antigo
            this.sendDecision(url, 'replace');
            return;
        }

        this.pendingRequest = {
            url,
            songTitle: document.querySelector(SONG_SELECTORS.TITLE)?.textContent?.trim()
                || MESSAGES.DEFAULT_TITLE,
            artist: document.querySelector(SONG_SELECTORS.ARTIST)?.textContent?.split('•')[0].trim()
                || MESSAGES.DEFAULT_ARTIST,
        };
        this.notify();
    }

    private isPlaying(): boolean {
        const video = document.querySelector<HTMLVideoElement>(SELECTORS.VIDEO);
        return !!video && !video.paused;
    }

    private pausePlayback(): void {
        if (this.isPlaying()) {
            document.querySelector<HTMLElement>(SELECTORS.PLAY_PAUSE)?.click();
        }
    }

    private sendDecision(url: string, decision: SessionDecision): void {
        this.send({ type: 'SESSION_DECISION', url, decision });
    }

    private send(message: SessionRuntimeMessage): void {
        if (this.dead || !hasRuntime()) return;
        try {
            chrome.runtime.sendMessage(message, () => void chrome.runtime.lastError);
        } catch {
            // Contexto da extensão invalidado (ex.: extensão recarregada)
            this.dead = true;
        }
    }

    private notify(): void {
        this.listeners.forEach(listener => listener(this.pendingRequest));
    }
}

export const sessionService = new SessionService();
