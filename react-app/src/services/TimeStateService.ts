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
import { timeToSeconds } from './TimeService';

/** DOM Selectors for YouTube Music player elements */
const SELECTORS = {
    TIME_INFO: 'ytmusic-player-bar .time-info',
    PROGRESS_BAR: 'ytmusic-player-bar #progress-bar',
    VIDEO: 'video',
} as const;

class TimeStateServiceClass {
    private state: TimeState = { ...DEFAULT_TIME_STATE };
    private listeners: Set<TimeStateListener> = new Set();
    private isTransitioning: boolean = false;

    /**
     * Synchronize state from YouTube Music DOM
     * This is the ONLY function that should read time from DOM
     */
    sync(): TimeState {
        if (this.isTransitioning) {
            return this.state;
        }

        const timeInfoEl = document.querySelector(SELECTORS.TIME_INFO);
        const progressBarEl = document.querySelector(SELECTORS.PROGRESS_BAR);
        const video = document.querySelector(SELECTORS.VIDEO) as HTMLVideoElement | null;

        if (!timeInfoEl) {
            return this.state;
        }

        // Parse time display text (e.g., "1:23 / 3:45")
        const timeText = timeInfoEl.textContent || '';
        const [currentTimeStr, totalTimeStr] = timeText.split(' / ').map(s => s.trim());

        // Get progress values from progress bar
        let progress = 0;
        let currentSec = 0;
        let durationSec = 0;

        if (progressBarEl) {
            const max = parseFloat(progressBarEl.getAttribute('aria-valuemax') || '100');
            currentSec = parseFloat(progressBarEl.getAttribute('aria-valuenow') || '0');
            durationSec = max;
            progress = max > 0 ? (currentSec / max) * 100 : 0;
        }

        // Use video duration as fallback if available (more accurate)
        if (video && video.duration && !isNaN(video.duration)) {
            durationSec = video.duration;
        }

        // If we couldn't get currentSec from progress bar, parse from display
        if (currentSec === 0 && currentTimeStr) {
            currentSec = timeToSeconds(currentTimeStr);
        }

        const newState: TimeState = {
            currentTime: currentTimeStr || '0:00',
            currentTimeSec: currentSec,
            totalTime: totalTimeStr || '0:00',
            duration: durationSec,
            progress,
        };

        this.setState(newState);
        return newState;
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
        if (value) {
            this.reset();
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
