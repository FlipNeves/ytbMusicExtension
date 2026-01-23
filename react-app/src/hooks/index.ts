/**
 * Hooks barrel export
 * 
 * @module hooks
 */

// Main facade hook (backward compatible)
export { useYTMObserver } from './useYTMObserver';

// Specialized hooks
export { useSongState } from './useSongState';
export { usePlayerControls } from './usePlayerControls';
export { useUpNext } from './useUpNext';
export { useTimeState } from './useTimeState';

// Visualizer hook
export { useVisualizer } from './useVisualizer';
