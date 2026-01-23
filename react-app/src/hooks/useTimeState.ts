/**
 * useTimeState - Hook for centralized time state subscription
 * 
 * Single Responsibility: Subscribe to TimeStateService and provide React state
 */

import { useState, useEffect, useCallback } from 'react';
import type { TimeState } from '../types';
import { DEFAULT_TIME_STATE } from '../types';
import { timeStateService } from '../services';

/**
 * Hook to subscribe to centralized time state
 * 
 * This is the React interface to the TimeStateService singleton.
 * Components using this hook will re-render when time state changes.
 */
export const useTimeState = () => {
    const [timeState, setTimeState] = useState<TimeState>(DEFAULT_TIME_STATE);

    useEffect(() => {
        // Subscribe to time state changes
        const unsubscribe = timeStateService.subscribe(setTimeState);
        return unsubscribe;
    }, []);

    /**
     * Manually trigger a sync from DOM
     * Useful when the component knows the DOM has updated
     */
    const syncTime = useCallback(() => {
        timeStateService.sync();
    }, []);

    /**
     * Reset time state (e.g., when song changes)
     */
    const resetTime = useCallback(() => {
        timeStateService.reset();
    }, []);

    /**
     * Set transitioning state
     */
    const setTransitioning = useCallback((value: boolean) => {
        timeStateService.setTransitioning(value);
    }, []);

    return {
        ...timeState,
        syncTime,
        resetTime,
        setTransitioning,
        isTransitioning: timeStateService.isInTransition(),
    };
};
