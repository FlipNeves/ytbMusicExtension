import React, { useState, useEffect } from 'react';
import { getUpcomingTracks, playQueueTrack, type QueueTrack } from '../../services/QueueService';

interface UpNextProps {
    nextTitle: string;
    nextArtist: string;
}

/**
 * UpNext - Próxima música + fila completa no hover
 *
 * O card mostra a próxima faixa; ao passar o mouse, expande com a lista
 * das próximas músicas da fila (clicáveis para pular direto para elas).
 */
const UpNext: React.FC<UpNextProps> = ({ nextTitle, nextArtist }) => {
    const [expanded, setExpanded] = useState(false);
    const [tracks, setTracks] = useState<QueueTrack[]>([]);

    // Mantém a lista atualizada enquanto aberta: as músicas avançam e a fila
    // exibida precisa acompanhar (nextTitle/nextArtist mudam a cada faixa)
    useEffect(() => {
        if (!expanded) return;

        const refresh = () => setTracks(getUpcomingTracks());
        refresh();
        const interval = setInterval(refresh, 2000);
        return () => clearInterval(interval);
    }, [expanded, nextTitle, nextArtist]);

    // A lista só abre ao passar o mouse no "···"; fecha ao sair do card inteiro
    const handleMoreEnter = () => {
        setTracks(getUpcomingTracks());
        setExpanded(true);
    };

    const handleCardLeave = () => setExpanded(false);

    const handleTrackClick = (track: QueueTrack) => {
        playQueueTrack(track);
        setExpanded(false);
    };

    return (
        <div
            className={`focus-next ${expanded ? 'expanded' : ''}`}
            onMouseLeave={handleCardLeave}
        >
            <div className="focus-next-header">
                <h3>A SEGUIR</h3>
                <button
                    className={`upnext-more-btn ${expanded ? 'active' : ''}`}
                    title="Ver fila de reprodução"
                    aria-label="Ver fila de reprodução"
                    aria-expanded={expanded}
                    onMouseEnter={handleMoreEnter}
                    onClick={() => (expanded ? setExpanded(false) : handleMoreEnter())}
                >
                    · · ·
                </button>
            </div>
            <div className="next-track-card">
                <div className="next-info">
                    <span className="next-title">{nextTitle}</span>
                    <span className="next-artist">{nextArtist}</span>
                </div>
            </div>

            {expanded && tracks.length > 0 && (
                <div className="upnext-queue-list" role="list">
                    {tracks.map((track, index) => (
                        <button
                            key={`${track.title}-${index}`}
                            className="upnext-queue-item"
                            role="listitem"
                            title="Tocar esta música"
                            onClick={() => handleTrackClick(track)}
                        >
                            <span className="upnext-queue-index">{index + 1}</span>
                            <span className="upnext-queue-text">
                                <span className="upnext-queue-title">{track.title}</span>
                                <span className="upnext-queue-artist">{track.artist}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UpNext;
