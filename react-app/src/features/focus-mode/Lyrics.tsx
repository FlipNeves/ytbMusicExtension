import React, { useEffect, useState, useRef } from 'react';
import type { LyricsProps, LyricLine } from '../../types';
import { fetchLyrics, isLyricsInCache } from '../../services';

/**
 * Lyrics component - Displays synchronized or plain lyrics
 * 
 * Refactored to use LyricsService for data fetching and caching.
 * Component now focuses on presentation logic only.
 */
const Lyrics: React.FC<LyricsProps> = ({ title, artist, isVisible, currentTime = 0, duration }) => {
    const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>([]);
    const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch lyrics when song or visibility changes
    useEffect(() => {
        if (!isVisible || !title || !artist) return;

        const abortController = new AbortController();

        // Check if already cached (avoid loading state)
        if (isLyricsInCache(title, artist)) {
            fetchLyrics(title, artist, duration, abortController.signal)
                .then((result) => {
                    setSyncedLyrics(result.syncedLyrics);
                    setPlainLyrics(result.plainLyrics);
                    setError(null);
                })
                .catch(() => {
                    // Ignore abort errors
                });
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setSyncedLyrics([]);
            setPlainLyrics(null);

            try {
                const result = await fetchLyrics(title, artist, duration, abortController.signal);

                if (result.syncedLyrics.length > 0) {
                    setSyncedLyrics(result.syncedLyrics);
                } else if (result.plainLyrics) {
                    setPlainLyrics(result.plainLyrics);
                } else {
                    setError('Letra não encontrada');
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

        fetchData();

        return () => {
            abortController.abort();
        };
    }, [title, artist, isVisible, duration]);

    // Auto-scroll to active lyric line
    useEffect(() => {
        if (activeLineRef.current && containerRef.current) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentTime]);

    /**
     * Find the active lyric line based on current time
     */
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

export default Lyrics;
