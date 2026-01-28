/**
 * LyricsService - Lyrics fetching and caching
 * 
 * Single Responsibility: Fetch, parse, and cache lyrics from lrclib.net
 */

import type { LyricLine, LyricsResult, LyricsApiResponse } from '../types';

/** Patterns to remove from song titles for better API matching */
const PATTERNS_TO_REMOVE = [
    /\s*\(Official\s*(Music\s*)?Video\)/gi,
    /\s*\(Official\s*Audio\)/gi,
    /\s*\(Lyric\s*Video\)/gi,
    /\s*\(Lyrics?\)/gi,
    /\s*\(Visualizer\)/gi,
    /\s*\(Audio\)/gi,
    /\s*\(HD\)/gi,
    /\s*\(HQ\)/gi,
    /\s*\(\d{4}\s*Remaster(ed)?\)/gi,
    /\s*-\s*Remaster(ed)?(\s*\d{4})?/gi,
    /\s*\[Official\s*(Music\s*)?Video\]/gi,
    /\s*\[Explicit\]/gi,
    /\s*\(Explicit\)/gi,
    /\s*\(Clean\)/gi,
];

/** Lyrics cache to avoid redundant API calls */
const lyricsCache = new Map<string, LyricsResult>();

/**
 * Normalize song title by removing common suffixes
 */
export const normalizeTitle = (title: string): string => {
    let normalized = title;
    for (const pattern of PATTERNS_TO_REMOVE) {
        normalized = normalized.replace(pattern, '');
    }
    return normalized.trim();
};

/**
 * Normalize artist name by extracting primary artist
 */
export const normalizeArtist = (artist: string): string => {
    return artist
        .split(/[,&]|\s+feat\.?\s+|\s+ft\.?\s+|\s+with\s+|\s+e\s+/i)[0]
        .trim();
};

/**
 * Parse LRC format lyrics into structured data
 */
export const parseLRC = (lrc: string): LyricLine[] => {
    const lines: LyricLine[] = [];
    const regex = /\[(\d+):(\d+)\.(\d+)\](.*)/;

    lrc.split('\n').forEach((line) => {
        const match = line.match(regex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = parseInt(match[3], 10);
            const time = minutes * 60 + seconds + ms / 100;
            const text = match[4].trim();
            if (text) {
                lines.push({ time, text });
            }
        }
    });

    return lines.sort((a, b) => a.time - b.time);
};

/**
 * Generate cache key for a song
 */
const getCacheKey = (title: string, artist: string): string => {
    return `${title}-${artist}`;
};

/**
 * Try to fetch lyrics using the /api/get endpoint
 */
const tryGetEndpoint = async (
    trackName: string,
    artistName: string,
    duration: number | undefined,
    signal: AbortSignal
): Promise<LyricsApiResponse | null> => {
    try {
        let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;

        if (duration && duration > 0) {
            url += `&duration=${Math.round(duration)}`;
        }

        const response = await fetch(url, { signal });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.syncedLyrics || data.plainLyrics) {
            return data;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Try to fetch lyrics using the /api/search endpoint (fallback)
 */
const trySearchEndpoint = async (
    trackName: string,
    artistName: string,
    signal: AbortSignal
): Promise<LyricsApiResponse | null> => {
    try {
        const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;

        const response = await fetch(url, { signal });

        if (!response.ok) return null;

        const results = await response.json();

        if (Array.isArray(results) && results.length > 0) {
            // Prefer results with synced lyrics
            const bestMatch = results.find((r: LyricsApiResponse) => r.syncedLyrics) || results[0];
            return bestMatch;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Fetch lyrics for a song
 * Attempts /api/get first, then falls back to /api/search
 * Results are cached to avoid redundant API calls
 */
export const fetchLyrics = async (
    title: string,
    artist: string,
    duration?: number,
    signal?: AbortSignal
): Promise<LyricsResult> => {
    const cacheKey = getCacheKey(title, artist);

    if (lyricsCache.has(cacheKey)) {
        return lyricsCache.get(cacheKey)!;
    }

    const cleanTitle = normalizeTitle(title);
    const cleanArtist = normalizeArtist(artist);
    const abortSignal = signal || new AbortController().signal;

    let data = await tryGetEndpoint(cleanTitle, cleanArtist, duration, abortSignal);

    if (!data && !abortSignal.aborted) {
        data = await trySearchEndpoint(cleanTitle, cleanArtist, abortSignal);
    }

    if (abortSignal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    let result: LyricsResult;

    if (data?.syncedLyrics) {
        const parsed = parseLRC(data.syncedLyrics);
        result = { syncedLyrics: parsed, plainLyrics: null };
    } else if (data?.plainLyrics) {
        result = { syncedLyrics: [], plainLyrics: data.plainLyrics };
    } else {
        result = { syncedLyrics: [], plainLyrics: null };
    }

    if (lyricsCache.size >= 5) {
        const firstKey = lyricsCache.keys().next().value;
        if (firstKey) lyricsCache.delete(firstKey);
    }

    lyricsCache.set(cacheKey, result);
    return result;
};

/**
 * Clear the lyrics cache
 */
export const clearCache = (): void => {
    lyricsCache.clear();
};

/**
 * Check if lyrics are available in cache
 */
export const isInCache = (title: string, artist: string): boolean => {
    return lyricsCache.has(getCacheKey(title, artist));
};
