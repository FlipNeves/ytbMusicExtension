import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './sidebar.css';
import { getSidebarPlaylists, openSidebarPlaylist, type SidebarPlaylist } from '../../services/PlaylistService';
import { useAutoCollapseSidebar } from '../../hooks/useAutoCollapseSidebar';

/**
 * PlaylistsMenu - Acesso minimalista às playlists com o menu lateral recolhido
 *
 * Injeta um ícone na nav bar do YTM; ao passar o mouse (ou clicar), abre um
 * popover com as playlists lidas do guide. Substitui a necessidade de expandir
 * o menu lateral, que é mantido sempre recolhido por useAutoCollapseSidebar.
 */
const PlaylistsMenu: React.FC = () => {
    const [target, setTarget] = useState<Element | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [playlists, setPlaylists] = useState<SidebarPlaylist[]>([]);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useAutoCollapseSidebar();

    useEffect(() => {
        // Mesmo padrão dos demais botões injetados: recria o container se a SPA re-renderizar
        const ensureContainer = () => {
            // Posição preferida: no rail recolhido, abaixo de "Biblioteca"
            // (#mini-guide só existe com o menu recolhido — que a extensão garante)
            const miniItems =
                document.querySelector('#mini-guide-renderer ytmusic-guide-section-renderer[is-primary] #items') ||
                document.querySelector('#mini-guide-renderer #items');

            const existing = document.getElementById('btn-playlists-menu-container');
            if (existing?.isConnected) {
                const isInMiniGuide = !!existing.closest('#mini-guide');
                // Já está no lugar preferido, ou ainda não há rail para onde migrar
                if (isInMiniGuide || !miniItems) return;
                existing.remove();
            }

            const container = document.createElement('div');
            container.id = 'btn-playlists-menu-container';
            container.className = 'playlists-menu-container';

            if (miniItems) {
                container.classList.add('in-mini-guide');
                miniItems.appendChild(container);
                setTarget(container);
                return;
            }

            // Fallback (rail ainda não montado): nav bar, ao lado das setas
            const navButtons = document.getElementById('btn-browser-nav-container');
            if (navButtons?.isConnected) {
                navButtons.insertAdjacentElement('afterend', container);
                setTarget(container);
                return;
            }
            const leftContent = document.querySelector('ytmusic-nav-bar .left-content');
            if (leftContent) {
                leftContent.insertBefore(container, leftContent.children[1] ?? null);
                setTarget(container);
            }
        };

        ensureContainer();
        const interval = setInterval(ensureContainer, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, []);

    const open = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setPlaylists(getSidebarPlaylists());
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
            const isInSidebar = !!buttonRef.current?.closest('#mini-guide');
            // No rail lateral o popover abre para a direita; na nav bar, para baixo
            setPosition(isInSidebar
                ? { top: Math.max(8, Math.round(rect.top)), left: Math.round(rect.right + 10) }
                : { top: rect.bottom + 8, left: rect.left });
        }
        setIsOpen(true);
    };

    const scheduleClose = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 250);
    };

    const handleSelect = (playlist: SidebarPlaylist) => {
        setIsOpen(false);
        openSidebarPlaylist(playlist);
    };

    const goToLibrary = () => {
        setIsOpen(false);
        window.location.href = 'https://music.youtube.com/library/playlists';
    };

    if (!target) {
        return null;
    }

    return ReactDOM.createPortal(
        <div
            className="playlists-menu"
            onMouseEnter={open}
            onMouseLeave={scheduleClose}
        >
            <button
                ref={buttonRef}
                className="playlists-menu-btn"
                title="Playlists"
                aria-label="Mostrar playlists"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => (isOpen ? setIsOpen(false) : open())}
            >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zm14-8v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V10h3V8h-5z" />
                </svg>
                <span className="playlists-menu-label">Playlists</span>
            </button>

            {isOpen && position && (
                <div
                    className="playlists-dropdown"
                    role="menu"
                    style={{ top: position.top, left: position.left }}
                    onMouseEnter={open}
                    onMouseLeave={scheduleClose}
                >
                    <div className="playlists-dropdown-header">Playlists</div>

                    {playlists.length > 0 ? (
                        <div className="playlists-dropdown-list">
                            {playlists.map((playlist) => (
                                <button
                                    key={playlist.href || playlist.title}
                                    className="playlist-item"
                                    role="menuitem"
                                    onClick={() => handleSelect(playlist)}
                                >
                                    <span className="playlist-item-title">{playlist.title}</span>
                                    {playlist.subtitle && (
                                        <span className="playlist-item-subtitle">{playlist.subtitle}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="playlists-empty">Nenhuma playlist encontrada</p>
                    )}

                    <button className="playlists-library-link" role="menuitem" onClick={goToLibrary}>
                        Ver biblioteca completa
                    </button>
                </div>
            )}
        </div>,
        target
    );
};

export default PlaylistsMenu;
