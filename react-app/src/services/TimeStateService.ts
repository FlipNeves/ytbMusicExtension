/**
 * TimeStateService - Centralized time state management
 * 
 * Single Responsibility: Single source of truth for all time-related data
 * 
 * This service eliminates the previous duplication between syncPlayerState()
 * and updateTime() by providing one place to read DOM and notify all consumers.
 */

import type { TimeState, TimeStateListener } from '../types';
import { DEFAULT_TIME_STATE } from '../types';
import { SELECTORS } from '../constants';
import { timeToSeconds } from './TimeService';

/**
 * Teto de uma transição: se nenhuma troca de faixa a encerrar (fim da fila,
 * "repetir uma", mesma música em seguida), as leituras voltam sozinhas.
 */
const MAX_TRANSITION_MS = 1500;

/** Posição do player (interceptor) só vale enquanto chega com frequência */
const PRECISE_TIME_MAX_AGE_MS = 1500;

/** Diferença máxima aceita entre a posição do player e a do slider */
const PRECISE_TIME_MAX_DRIFT_S = 1.5;

/** Valores crus da UI do YTM: texto "1:23 / 3:45" e atributos do slider */
export interface TimeSources {
    timeText: string;
    ariaNow: string | null;
    ariaMax: string | null;
    /**
     * Posição fracionada lida do player. Refina a do slider (segundos
     * inteiros) — as letras trocavam de linha até 1 s atrasadas — e só é
     * usada quando bate com ela, o que descarta leituras da faixa anterior.
     */
    preciseTime?: number;
}

/**
 * Monta o estado de tempo a partir da própria UI do YTM.
 *
 * Posição, duração e progresso saem da mesma fonte, para que a barra exibida
 * e o clique de seek nunca divirjam. O <video> não entra na conta: ele reflete
 * a mídia carregada no elemento (anúncio, MediaSource), não a faixa. Na
 * reprodução sem pausas (gapless) o MediaSource segue entre faixas e o
 * video.duration não encolhe de uma faixa longa para uma curta — o seek
 * calculado com ele caía em outro ponto da música.
 */
export const computeTimeState = ({ timeText, ariaNow, ariaMax, preciseTime }: TimeSources): TimeState => {
    const [currentTimeStr = '', totalTimeStr = ''] = timeText.split(' / ').map(s => s.trim());

    const max = parseFloat(ariaMax ?? '');
    const duration = max > 0 ? max : timeToSeconds(totalTimeStr);

    let currentSec = parseFloat(ariaNow ?? '');
    if (!Number.isFinite(currentSec) || currentSec === 0) {
        currentSec = timeToSeconds(currentTimeStr);
    }

    if (preciseTime !== undefined && Math.abs(preciseTime - currentSec) <= PRECISE_TIME_MAX_DRIFT_S) {
        currentSec = preciseTime;
    }

    const progress = duration > 0 ? Math.min(100, Math.max(0, (currentSec / duration) * 100)) : 0;

    return {
        currentTime: currentTimeStr || '0:00',
        currentTimeSec: currentSec,
        totalTime: totalTimeStr || '0:00',
        duration,
        progress,
    };
};

class TimeStateServiceClass {
    private state: TimeState = { ...DEFAULT_TIME_STATE };
    private listeners: Set<TimeStateListener> = new Set();
    private isTransitioning: boolean = false;
    private transitionTimeout: ReturnType<typeof setTimeout> | null = null;
    private preciseTime: { seconds: number; receivedAt: number } | null = null;

    /**
     * Synchronize state from YouTube Music DOM
     * This is the ONLY function that should read time from DOM
     */
    sync(): TimeState {
        if (this.isTransitioning) {
            return this.state;
        }

        const timeInfoEl = document.querySelector(SELECTORS.TIME_INFO);
        if (!timeInfoEl) {
            return this.state;
        }

        const precise = this.preciseTime;
        const isFresh = precise !== null && Date.now() - precise.receivedAt <= PRECISE_TIME_MAX_AGE_MS;

        const progressBarEl = document.querySelector(SELECTORS.PROGRESS_BAR);
        const newState = computeTimeState({
            timeText: timeInfoEl.textContent || '',
            ariaNow: progressBarEl?.getAttribute('aria-valuenow') ?? null,
            ariaMax: progressBarEl?.getAttribute('aria-valuemax') ?? null,
            preciseTime: isFresh ? precise.seconds : undefined,
        });

        this.setState(newState);
        return newState;
    }

    /**
     * Posição fracionada enviada pelo player (interceptor), ~4x por segundo
     */
    setPreciseTime(seconds: number): void {
        this.preciseTime = { seconds, receivedAt: Date.now() };
        this.sync();
    }

    /**
     * Get current state without reading from DOM
     */
    getState(): TimeState {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes
     * Returns an unsubscribe function
     */
    subscribe(listener: TimeStateListener): () => void {
        this.listeners.add(listener);
        // Immediately notify with current state
        listener(this.getState());

        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Reset state when song changes
     */
    reset(): void {
        this.setState({ ...DEFAULT_TIME_STATE });
    }

    /**
     * Set transitioning flag to prevent updates during song changes
     */
    setTransitioning(value: boolean): void {
        this.isTransitioning = value;

        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }

        if (value) {
            this.reset();
            this.transitionTimeout = setTimeout(() => {
                this.transitionTimeout = null;
                this.isTransitioning = false;
                this.sync();
            }, MAX_TRANSITION_MS);
        }
    }

    /**
     * Check if currently transitioning
     */
    isInTransition(): boolean {
        return this.isTransitioning;
    }

    /**
     * Internal: Update state and notify listeners
     */
    private setState(newState: TimeState): void {
        // Only notify if state actually changed
        if (
            this.state.currentTimeSec !== newState.currentTimeSec ||
            this.state.progress !== newState.progress ||
            this.state.duration !== newState.duration
        ) {
            this.state = newState;
            this.notifyListeners();
        }
    }

    /**
     * Internal: Notify all listeners of state change
     */
    private notifyListeners(): void {
        const currentState = this.getState();
        this.listeners.forEach(listener => {
            try {
                listener(currentState);
            } catch (error) {
                console.error('[TimeStateService] Listener error:', error);
            }
        });
    }
}

// Export singleton instance
export const timeStateService = new TimeStateServiceClass();
