import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { sessionService } from '../../services/SessionService';
import type { SessionSummary } from '../../types/sessions';
import { A11Y, MESSAGES, TIMING } from '../../constants';
import './sessions.css';

const CONTAINER_ID = 'ytm-sessions-menu-container';
const REFRESH_INTERVAL = 4000;

/**
 * Botão na nav bar do YTM com a lista de sessões abertas.
 * Segue o padrão de portal de BrowserNavButtons: o container é recriado
 * pelo intervalo caso a SPA destrua a nav bar.
 */
const SessionsMenu: React.FC = () => {
    const [target, setTarget] = useState<Element | null>(null);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ensureContainer = () => {
            const existing = document.getElementById(CONTAINER_ID);
            if (existing?.isConnected) return;

            const container = document.createElement('div');
            container.id = CONTAINER_ID;
            container.className = 'sessions-menu-container';

            // Ao lado dos botões de navegação, quando existirem
            const navButtons = document.getElementById('btn-browser-nav-container');
            if (navButtons?.isConnected && navButtons.parentElement) {
                navButtons.insertAdjacentElement('afterend', container);
                setTarget(container);
                return;
            }

            const leftContent = document.querySelector('ytmusic-nav-bar .left-content')
                || document.querySelector('ytmusic-nav-bar');
            if (leftContent) {
                leftContent.appendChild(container);
                setTarget(container);
            }
        };

        ensureContainer();
        const interval = setInterval(ensureContainer, TIMING.RETRY_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const refresh = useCallback(() => {
        sessionService.getSessions().then(setSessions);
    }, []);

    // Mantém o contador atualizado; pausa quando a aba está oculta
    useEffect(() => {
        refresh();
        const interval = setInterval(() => {
            if (!document.hidden) refresh();
        }, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [refresh]);

    // Fecha ao clicar fora ou com Esc
    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            const node = event.target as Node;
            if (!popoverRef.current?.contains(node) && !buttonRef.current?.contains(node)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown, true);
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown, true);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [open]);

    if (!target) {
        return null;
    }

    const toggle = () => {
        if (!open) {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
                setPosition({ top: rect.bottom + 8, left: rect.left });
            }
            refresh();
        }
        setOpen(value => !value);
    };

    const activate = (session: SessionSummary) => {
        if (!session.isSelf) {
            sessionService.activateSession(session.windowId);
        }
        setOpen(false);
    };

    const close = (session: SessionSummary) => {
        sessionService.closeSession(session.windowId);
        setSessions(current => current.filter(s => s.windowId !== session.windowId));
    };

    const createNew = () => {
        sessionService.createSession();
        setOpen(false);
    };

    const button = ReactDOM.createPortal(
        <button
            ref={buttonRef}
            className="browser-nav-btn sessions-menu-btn"
            title={MESSAGES.SESSIONS_TITLE}
            aria-label={A11Y.SESSIONS_MENU}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={toggle}
        >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M4 6H2v14a2 2 0 0 0 2 2h14v-2H4V6zm16-4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 14H8V4h12v12z" />
            </svg>
            {sessions.length > 1 && (
                <span className="sessions-menu-badge" aria-hidden="true">
                    {sessions.length}
                </span>
            )}
        </button>,
        target
    );

    // O popover vai para o body: dentro da nav bar, overflow/transform do YTM
    // poderiam cortá-lo mesmo com position fixed.
    const popover = open && position
        ? ReactDOM.createPortal(
            (
                <div
                    ref={popoverRef}
                    className="sessions-popover"
                    role="menu"
                    aria-label={A11Y.SESSIONS_MENU}
                    style={{ top: position.top, left: position.left }}
                >
                    <div className="sessions-popover-header">{MESSAGES.SESSIONS_TITLE}</div>
                    {sessions.map(session => (
                        <div
                            key={session.windowId}
                            className={`session-item${session.isSelf ? ' is-self' : ''}`}
                        >
                            <button
                                className="session-item-main"
                                role="menuitem"
                                title={session.title}
                                aria-label={`${A11Y.SESSION_SWITCH}: ${session.title}`}
                                disabled={session.isSelf}
                                onClick={() => activate(session)}
                            >
                                <span className="session-item-dot" aria-hidden="true" />
                                <span className="session-item-title">{session.title}</span>
                                {session.isSelf && (
                                    <span className="session-item-current">
                                        {MESSAGES.SESSION_CURRENT}
                                    </span>
                                )}
                            </button>
                            <button
                                className="session-item-close"
                                aria-label={`${A11Y.SESSION_CLOSE}: ${session.title}`}
                                onClick={() => close(session)}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>
                    ))}
                    <button
                        className="session-item-new"
                        role="menuitem"
                        aria-label={A11Y.SESSION_CREATE}
                        onClick={createNew}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        {MESSAGES.SESSION_NEW}
                    </button>
                </div>
            ),
            document.body
        )
        : null;

    return (
        <>
            {button}
            {popover}
        </>
    );
};

export default SessionsMenu;
