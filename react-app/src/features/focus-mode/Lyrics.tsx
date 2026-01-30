import React, { useEffect, useState, useRef } from 'react';
import type { LyricsProps, LyricLine } from '../../types';
import { fetchLyrics, isLyricsInCache } from '../../services';
import LyricsSkeleton from './LyricsSkeleton';

/**
 * Lyrics component - Displays synchronized or plain lyrics
 * 
 * Refactored to use LyricsService for data fetching and caching.
 * Component now focuses on presentation logic only.
 */
const Lyrics: React.FC<LyricsProps> = ({ title, artist, isVisible, currentTime = 0, duration, onLineClick }) => {
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

    const [autoScroll, setAutoScroll] = useState(true);
    const isProgrammaticScroll = useRef(false);

    // Auto-scroll to active lyric line
    useEffect(() => {
        if (autoScroll && activeLineRef.current && containerRef.current) {
            isProgrammaticScroll.current = true;
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
            setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 500);
        }
    }, [currentTime, autoScroll]);

    const handleScroll = () => {
        if (isProgrammaticScroll.current) return;
        if (!activeLineRef.current || !containerRef.current) return;

        const container = containerRef.current;
        const activeLine = activeLineRef.current;

        const containerCenter = container.scrollTop + container.clientHeight / 2;
        const activeLineCenter = activeLine.offsetTop + activeLine.clientHeight / 2;
        const distance = Math.abs(containerCenter - activeLineCenter);

        const RE_ENABLE_THRESHOLD = 100;
        const DISABLE_THRESHOLD = 110;

        if (distance < RE_ENABLE_THRESHOLD && !autoScroll) {
            setAutoScroll(true);
        } else if (distance > DISABLE_THRESHOLD && autoScroll) {
            setAutoScroll(false);
        }
    };

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
            <div className="focus-lyrics-header">
                <h3>Letra</h3>
                <button
                    className={`focus-pill-btn ${autoScroll ? 'active' : ''}`}
                    onClick={() => setAutoScroll(!autoScroll)}
                    title={autoScroll ? "Desativar rolagem automática" : "Ativar rolagem automática"}
                >
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" transform={autoScroll ? "rotate(180 12 12)" : ""} />
                    </svg>
                    <span>{autoScroll ? "Sync On" : "Sync Off"}</span>
                </button>
            </div>

            <div
                className="focus-lyrics-content"
                ref={containerRef}
                onScroll={handleScroll}
            >
                {loading && <LyricsSkeleton />}
                {error && <p className="lyrics-error">{error}</p>}

                {syncedLyrics.length > 0 && (
                    <div className="synced-lyrics">
                        {syncedLyrics.map((line, index) => (
                            <div
                                key={index}
                                ref={index === activeIndex ? activeLineRef : null}
                                className={`lyric-line ${index === activeIndex ? 'active' : ''} ${index < activeIndex ? 'past' : ''}`}
                                onClick={() => onLineClick?.(line.time)}
                                title="Ir para este trecho"
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
