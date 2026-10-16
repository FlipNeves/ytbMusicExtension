/**
 * SessionService - Content-side session management
 *
 * Single Responsibility: bridge between the background session registry and
 * the React UI (confirmation prompt, sessions menu, focus shortcut).
 *
 * The background sends SESSION_INCOMING_LINK when an external YTM link
 * arrives while this session is active. If nothing is playing the link is
 * consumed silently (replace, same as before sessions existed); otherwise a
 * prompt request is published for <SessionPrompt /> to render.
 *
 * It also reports what is playing (so the session can be reopened when the
 * browser starts) and, in a session reopened that way, resumes the saved
 * position paused.
 */

import type {
    SessionDecision,
    SessionPlayback,
    SessionPromptRequest,
    SessionRestore,
    SessionRuntimeMessage,
    SessionSummary,
} from '../types/sessions';
import { MESSAGES, SELECTORS } from '../constants';
import { onPlayerState, playNext, seekTo, type PlayerSnapshot } from './YTMBridge';
import { getQueueTarget } from './TrackUrl';

type PromptListener = (request: SessionPromptRequest | null) => void;
type Listener<T = void> = (value: T) => void;

/** Intervalo entre relatórios de posição ao background */
const PLAYBACK_REPORT_INTERVAL_MS = 10_000;

/** Tempo máximo para a faixa reaberta carregar antes de desistir de restaurar */
const RESTORE_TIMEOUT_MS = 30_000;

const hasRuntime = (): boolean => {
    try {
        return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
    } catch {
        return false;
    }
};

class SessionService {
    private listeners = new Set<PromptListener>();
    private sessionsChangedListeners = new Set<Listener>();
    private focusToggleListeners = new Set<Listener>();
    private noticeListeners = new Set<Listener<string>>();
    private pendingRequest: SessionPromptRequest | null = null;
    private initialized = false;
    private lastReport: { videoId: string; at: number } | null = null;
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
            switch (message?.type) {
                case 'SESSION_INCOMING_LINK':
                    if (typeof message.url === 'string') {
                        this.handleIncomingLink(message.url);
                    }
                    sendResponse({ handled: true });
                    return;
                case 'SESSION_PAUSE':
                    this.pausePlayback();
                    sendResponse({ ok: true });
                    return;
                case 'SESSIONS_CHANGED':
                    this.sessionsChangedListeners.forEach(listener => listener());
                    return;
                case 'FOCUS_TOGGLE':
                    this.focusToggleListeners.forEach(listener => listener());
                    sendResponse({ ok: true });
                    return;
            }
        });

        onPlayerState(snapshot => this.reportPlayback(snapshot));
        this.requestRestore();
    }

    /** UI subscribe: recebe o pedido de confirmação pendente (ou null) */
    subscribe(listener: PromptListener): () => void {
        this.listeners.add(listener);
        listener(this.pendingRequest);
        return () => this.listeners.delete(listener);
    }

    /** Avisa quando o registro de sessões muda (abrir/fechar/focar janelas) */
    onSessionsChanged(listener: Listener): () => void {
        this.sessionsChangedListeners.add(listener);
        return () => this.sessionsChangedListeners.delete(listener);
    }

    /** Atalho de teclado da extensão para abrir/fechar o modo foco */
    onFocusToggle(listener: Listener): () => void {
        this.focusToggleListeners.add(listener);
        return () => this.focusToggleListeners.delete(listener);
    }

    /** Mensagens curtas para o usuário (ex.: falha ao colocar na fila) */
    onNotice(listener: Listener<string>): () => void {
        this.noticeListeners.add(listener);
        return () => this.noticeListeners.delete(listener);
    }

    /** Decisão vinda do diálogo de confirmação */
    resolvePrompt(decision: SessionDecision): void {
        if (!this.pendingRequest) return;
        const { url } = this.pendingRequest;
        this.pendingRequest = null;
        this.notify();

        if (decision === 'queue') {
            void this.queueNext(url);
            return;
        }
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
            songTitle: document.querySelector(SELECTORS.TITLE)?.textContent?.trim()
                || MESSAGES.DEFAULT_TITLE,
            artist: document.querySelector(SELECTORS.ARTIST)?.textContent?.split('•')[0].trim()
                || MESSAGES.DEFAULT_ARTIST,
            canQueue: getQueueTarget(url) !== null,
        };
        this.notify();
    }

    /** "Tocar a seguir": entra na fila desta sessão, sem trocar a música atual */
    private async queueNext(url: string): Promise<void> {
        const target = getQueueTarget(url);
        const queued = target ? await playNext(target) : false;
        if (!queued) {
            this.noticeListeners.forEach(listener => listener(MESSAGES.QUEUE_FAILED));
        }
    }

    /** Conta ao background o que está tocando, para reabrir no início do navegador */
    private reportPlayback(snapshot: PlayerSnapshot): void {
        if (!snapshot.videoId || !this.isPlaying()) return;

        const now = Date.now();
        const sameTrack = this.lastReport?.videoId === snapshot.videoId;
        if (sameTrack && now - this.lastReport!.at < PLAYBACK_REPORT_INTERVAL_MS) return;
        this.lastReport = { videoId: snapshot.videoId, at: now };

        const playback: SessionPlayback = {
            videoId: snapshot.videoId,
            playlistId: snapshot.playlistId,
            time: Math.floor(snapshot.currentTime),
            title: document.querySelector(SELECTORS.TITLE)?.textContent?.trim() || '',
        };
        this.send({ type: 'SESSION_PLAYBACK', playback });
    }

    /** Sessão reaberta no início do navegador? O background responde com a posição */
    private requestRestore(): void {
        if (this.dead || !hasRuntime()) return;
        try {
            const message: SessionRuntimeMessage = { type: 'SESSION_HELLO' };
            chrome.runtime.sendMessage(message, (response?: { restore?: SessionRestore }) => {
                if (chrome.runtime.lastError || !response?.restore) return;
                this.applyRestore(response.restore);
            });
        } catch {
            this.dead = true;
        }
    }

    /**
     * Quando a faixa reaberta carrega: pausa (o navegador acabou de abrir —
     * tocar sozinho seria invasivo) e volta à posição salva. Só a primeira
     * leitura conta, para não interferir quando a pessoa der play.
     */
    private applyRestore(restore: SessionRestore): void {
        const stop = onPlayerState(snapshot => {
            if (snapshot.videoId !== restore.videoId) return;
            stop();
            clearTimeout(timeout);

            this.pausePlayback();
            if (restore.time > 3 && restore.time < snapshot.duration - 3) {
                seekTo(restore.time);
            }
        });
        const timeout = setTimeout(stop, RESTORE_TIMEOUT_MS);
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
