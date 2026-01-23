/**
 * TimeService - Utility functions for time parsing and formatting
 * 
 * Single Responsibility: Convert between time formats
 */

/**
 * Convert time string to seconds
 * Supports formats: "M:SS", "MM:SS", "H:MM:SS"
 */
export const timeToSeconds = (time: string): number => {
    const parts = time.split(':').map(Number);

    if (parts.some(isNaN)) {
        return 0;
    }

    // H:MM:SS format
    if (parts.length === 3) {
        const [h, m, s] = parts;
        return h * 3600 + m * 60 + s;
    }

    // M:SS or MM:SS format
    if (parts.length === 2) {
        const [m, s] = parts;
        return m * 60 + s;
    }

    return 0;
};

/**
 * Format seconds as time string
 * Outputs M:SS or H:MM:SS depending on duration
 */
export const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
        return '0:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
