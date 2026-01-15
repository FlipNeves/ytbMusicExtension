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

const Lyrics: React.FC<LyricsProps> = ({ title, artist, isVisible, currentTime = 0 }) => {
    const [syncedLyrics, setSyncedLyrics] = useState<LyricLine[]>([]);
    const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isVisible || !title || !artist) return;

        const fetchLyrics = async () => {
            setLoading(true);
            setError(null);
            setSyncedLyrics([]);
            setPlainLyrics(null);

            try {
                const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').trim();
                const cleanArtist = artist.split(',')[0].trim();

                const response = await fetch(
                    `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`
                );

                if (!response.ok) {
                    throw new Error('Letra não encontrada');
                }

                const data = await response.json();

                if (data.syncedLyrics) {
                    const parsed = parseLRC(data.syncedLyrics);
                    setSyncedLyrics(parsed);
                } else if (data.plainLyrics) {
                    setPlainLyrics(data.plainLyrics);
                } else {
                    throw new Error('Letra não disponível');
                }
            } catch {
                setError('Letra não encontrada');
            } finally {
                setLoading(false);
            }
        };

        fetchLyrics();
    }, [title, artist, isVisible]);

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

export default Lyrics;

