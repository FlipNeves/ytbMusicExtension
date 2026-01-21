import React, { useEffect, useState, useRef } from 'react';

interface LyricLine {
    time: number;
    text: string;
}

interface LyricsProps {
    title: string;
    artist: string;
    isVisible: boolean;
    currentTime?: number;
    duration?: number;
}

const parseLRC = (lrc: string): LyricLine[] => {
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

const normalizeTitle = (title: string): string => {
    let normalized = title;
    for (const pattern of PATTERNS_TO_REMOVE) {
        normalized = normalized.replace(pattern, '');
    }
    return normalized.trim();
};

const normalizeArtist = (artist: string): string => {
    return artist
        .split(/[,&]|\s+feat\.?\s+|\s+ft\.?\s+|\s+with\s+|\s+e\s+/i)[0]
        .trim();
};

const lyricsCache = new Map<string, { syncedLyrics: LyricLine[]; plainLyrics: string | null }>();

const Lyrics: React.FC<LyricsProps> = ({ title, artist, isVisible, currentTime = 0, duration }) => {
    const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>([]);
    const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isVisible || !title || !artist) return;

        const abortController = new AbortController();
        const cacheKey = `${title}-${artist}`;

        if (lyricsCache.has(cacheKey)) {
            const cached = lyricsCache.get(cacheKey)!;
            setSyncedLyrics(cached.syncedLyrics);
            setPlainLyrics(cached.plainLyrics);
            setError(null);
            return;
        }

        const fetchLyrics = async () => {
            setLoading(true);
            setError(null);
            setSyncedLyrics([]);
            setPlainLyrics(null);

            const cleanTitle = normalizeTitle(title);
            const cleanArtist = normalizeArtist(artist);

            try {
                let data = await tryGetEndpoint(cleanTitle, cleanArtist, duration, abortController.signal);

                if (!data && abortController.signal.aborted) return;

                if (!data) {
                    data = await trySearchEndpoint(cleanTitle, cleanArtist, abortController.signal);
                }

                if (abortController.signal.aborted) return;

                if (data?.syncedLyrics) {
                    const parsed = parseLRC(data.syncedLyrics);
                    setSyncedLyrics(parsed);
                    lyricsCache.set(cacheKey, { syncedLyrics: parsed, plainLyrics: null });
                } else if (data?.plainLyrics) {
                    setPlainLyrics(data.plainLyrics);
                    lyricsCache.set(cacheKey, { syncedLyrics: [], plainLyrics: data.plainLyrics });
                } else {
                    throw new Error('Letra não disponível');
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                setError('Letra não encontrada');
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchLyrics();

        return () => {
            abortController.abort();
        };
    }, [title, artist, isVisible, duration]);

    useEffect(() => {
        if (activeLineRef.current && containerRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentTime]);

    const getActiveLine = (): number => {
        for (let i = syncedLyrics.length - 1; i >= 0; i--) {
            if (currentTime >= syncedLyrics[i].time) {
                return i;
            }
        }
        return -1;
    };

    const activeIndex = getActiveLine();

    return (
        <div className={`focus-lyrics ${isVisible ? 'visible' : ''}`}>
            <h3>Letra</h3>
            <div className="focus-lyrics-content" ref={containerRef}>
                {loading && <p className="lyrics-loading">Buscando letra...</p>}
                {error && <p className="lyrics-error">{error}</p>}

                {syncedLyrics.length > 0 && (
                    <div className="synced-lyrics">
                        {syncedLyrics.map((line, index) => (
                            <div
                                key={index}
                                ref={index === activeIndex ? activeLineRef : null}
                                className={`lyric-line ${index === activeIndex ? 'active' : ''} ${index < activeIndex ? 'past' : ''}`}
                            >
                                {line.text}
                            </div>
                        ))}
                    </div>
                )}

                {plainLyrics && !syncedLyrics.length && (
                    <pre className="lyrics-text">{plainLyrics}</pre>
                )}
            </div>
        </div>
    );
};

interface LyricsResponse {
    syncedLyrics?: string;
    plainLyrics?: string;
}

async function tryGetEndpoint(
    trackName: string,
    artistName: string,
    duration: number | undefined,
    signal: AbortSignal
): Promise<LyricsResponse | null> {
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
}

async function trySearchEndpoint(
    trackName: string,
    artistName: string,
    signal: AbortSignal
): Promise<LyricsResponse | null> {
    try {
        const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;

        const response = await fetch(url, { signal });

        if (!response.ok) return null;

        const results = await response.json();

        if (Array.isArray(results) && results.length > 0) {
            const bestMatch = results.find((r: LyricsResponse) => r.syncedLyrics) || results[0];
            return bestMatch;
        }
        return null;
    } catch {
        return null;
    }
}

export default Lyrics;
