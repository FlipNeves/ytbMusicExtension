/**
 * useYTMObserver - Facade hook for YouTube Music observation
 * 
 * This hook maintains backward compatibility while delegating to
 * specialized hooks internally. It follows the Facade pattern.
 * 
 * @module hooks/useYTMObserver
 */

import { useSongState } from './useSongState';
import { usePlayerControls } from './usePlayerControls';
import { useUpNext } from './useUpNext';

/**
 * Main hook for observing YouTube Music player state
 * 
 * This is a facade that composes multiple specialized hooks:
 * - useSongState: Current song information
 * - usePlayerControls: Player control actions and state
 * - useUpNext: Next track information
 * 
 * The interface is preserved for backward compatibility with existing components.
 */
export const useYTMObserver = () => {
  const songInfo = useSongState();
  const { volume, isLiked, isPlaying, setVolume, toggleLike, seekTo } = usePlayerControls();
  const upNextInfo = useUpNext();

  return {
    songInfo,
    isPlaying,
    upNextInfo,
    volume,
    isLiked,
    setVolume,
    toggleLike,
    seekTo,
  };
};
