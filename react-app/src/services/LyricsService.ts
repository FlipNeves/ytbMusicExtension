/**
 * LyricsService - Lyrics fetching and caching
 *
 * Single Responsibility: Fetch, parse, and cache lyrics from lrclib.net
 */

import type { LyricLine, LyricsResult, LyricsApiResponse } from '../types';
import { LIMITS } from '../constants';

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

/** [mm:ss], [mm:ss.x], [mm:ss.xx] ou [mm:ss.xxx] (também com ':' antes da fração) */
const LRC_TIMESTAMP = /\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Parse LRC format lyrics into structured data.
 * A fração vale pelo número de dígitos (".5" = 0,5 s; ".345" = 0,345 s) e uma
 * linha pode ter vários tempos (refrões repetidos).
 */
export const parseLRC = (lrc: string): LyricLine[] => {
    const lines: LyricLine[] = [];

    for (const rawLine of lrc.split(/\r?\n/)) {
        const stamps = [...rawLine.matchAll(LRC_TIMESTAMP)];
        if (stamps.length === 0) continue;

        const text = rawLine.replace(LRC_TIMESTAMP, '').trim();
        if (!text) continue;

        for (const [, minutes, seconds, fraction = ''] of stamps) {
            const fractionSeconds = fraction ? parseInt(fraction, 10) / 10 ** fraction.length : 0;
            lines.push({ time: parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + fractionSeconds, text });
        }
    }

    return lines.sort((a, b) => a.time - b.time);
};

/**
 * Generate cache key for a song
 */
const getCacheKey = (title: string, artist: string): string => {
    return `${title}-${artist}`;
};

/**
 * Resultado de uma consulta ao lrclib: "missing" é resposta definitiva (pode
 * ir para o cache); "error" é falha de rede/servidor (não pode).
 */
type Lookup =
    | { status: 'found'; data: LyricsApiResponse }
    | { status: 'missing' }
    | { status: 'error' };

/** Falha de rede/servidor ao buscar a letra (nada foi guardado no cache) */
export class LyricsUnavailableError extends Error {
    constructor() {
        super('Lyrics service unavailable');
        this.name = 'LyricsUnavailableError';
    }
}

const hasLyrics = (data: LyricsApiResponse | null | undefined): data is LyricsApiResponse =>
    !!data && !!(data.syncedLyrics || data.plainLyrics);

/**
 * Try to fetch lyrics using the /api/get endpoint
 */
const tryGetEndpoint = async (
    trackName: string,
    artistName: string,
    duration: number | undefined,
    signal: AbortSignal
): Promise<Lookup> => {
    try {
        let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;

        if (duration && duration > 0) {
            url += `&duration=${Math.round(duration)}`;
        }

        const response = await fetch(url, { signal });

        if (response.status === 404) return { status: 'missing' };
        if (!response.ok) return { status: 'error' };

        const data = await response.json();
        return hasLyrics(data) ? { status: 'found', data } : { status: 'missing' };
    } catch {
        return { status: 'error' };
    }
};

/**
 * Try to fetch lyrics using the /api/search endpoint (fallback)
 */
const trySearchEndpoint = async (
    trackName: string,
    artistName: string,
    signal: AbortSignal
): Promise<Lookup> => {
    try {
        const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;

        const response = await fetch(url, { signal });

        if (!response.ok) return { status: 'error' };

        const results: unknown = await response.json();
        if (!Array.isArray(results)) return { status: 'missing' };

        // Prefer results with synced lyrics
        const candidates = results as LyricsApiResponse[];
        const bestMatch = candidates.find((r) => r.syncedLyrics) || candidates.find(hasLyrics);
        return bestMatch ? { status: 'found', data: bestMatch } : { status: 'missing' };
    } catch {
        return { status: 'error' };
    }
};

/**
 * Fetch lyrics for a song
 * Attempts /api/get first, then falls back to /api/search.
 * Results are cached to avoid redundant API calls; network/server failures
 * are not — they throw LyricsUnavailableError, so the next attempt retries.
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

    let lookup = await tryGetEndpoint(cleanTitle, cleanArtist, duration, abortSignal);

    if (lookup.status !== 'found' && !abortSignal.aborted) {
        lookup = await trySearchEndpoint(cleanTitle, cleanArtist, abortSignal);
    }

    if (abortSignal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    if (lookup.status === 'error') {
        throw new LyricsUnavailableError();
    }

    const data = lookup.status === 'found' ? lookup.data : null;
    let result: LyricsResult;

    if (data?.syncedLyrics) {
        const parsed = parseLRC(data.syncedLyrics);
        result = { syncedLyrics: parsed, plainLyrics: null };
    } else if (data?.plainLyrics) {
        result = { syncedLyrics: [], plainLyrics: data.plainLyrics };
    } else {
        result = { syncedLyrics: [], plainLyrics: null };
    }

    if (lyricsCache.size >= LIMITS.MAX_LYRICS_CACHE) {
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
