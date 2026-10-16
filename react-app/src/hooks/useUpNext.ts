/**
 * useUpNext - Hook for next track information
 *
 * Single Responsibility: Subscribe to next track updates from interceptor
 */

import { useState, useEffect } from 'react';
import type { UpNextInfo } from '../types';
import { DEFAULT_UP_NEXT_INFO } from '../types';
import { onNextTrackUpdate } from '../services';

/**
 * Hook to get information about the next track in queue
 * (extracted from the queue DOM by the interceptor)
 */
export const useUpNext = () => {
    const [upNextInfo, setUpNextInfo] = useState<UpNextInfo>(DEFAULT_UP_NEXT_INFO);

    useEffect(() => onNextTrackUpdate(setUpNextInfo), []);

    return upNextInfo;
};
