import React, { useEffect, useRef, useState } from 'react';
import { sessionService } from '../../services/SessionService';
import type { SessionDecision, SessionPromptRequest } from '../../types/sessions';
import { MESSAGES } from '../../constants';
import './sessions.css';

const NOTICE_DURATION_MS = 4000;

/**
 * Diálogo de confirmação exibido quando um link externo chega com música
 * tocando: tocar a seguir nesta sessão, abrir em nova sessão, substituir a
 * atual ou ignorar o link. Também mostra avisos curtos (ex.: falha na fila).
 */
const SessionPrompt: React.FC = () => {
    const [request, setRequest] = useState<SessionPromptRequest | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const primaryRef = useRef<HTMLButtonElement>(null);

    useEffect(() => sessionService.subscribe(setRequest), []);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        const unsubscribe = sessionService.onNotice((message) => {
            setNotice(message);
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
        });
        return () => {
            unsubscribe();
            if (timeout) clearTimeout(timeout);
        };
    }, []);

    useEffect(() => {
        if (request) {
            primaryRef.current?.focus();
        }
    }, [request]);

    if (!request) {
        return notice ? <div className="session-notice" role="status">{notice}</div> : null;
    }

    const decide = (decision: SessionDecision) => sessionService.resolvePrompt(decision);

    const handleKeyDown = (event: React.KeyboardEvent) => {
        // Não deixa o Esc/atalhos vazarem para os handlers globais do Focus Mode
        event.stopPropagation();

        if (event.key === 'Escape') {
            decide('cancel');
            return;
        }

        if (event.key === 'Tab') {
            const buttons = Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>('button') ?? []
            );
            if (buttons.length === 0) return;

            event.preventDefault();
            const index = buttons.indexOf(document.activeElement as HTMLElement);
            const next = event.shiftKey
                ? (index <= 0 ? buttons.length - 1 : index - 1)
                : (index === buttons.length - 1 ? 0 : index + 1);
            buttons[next].focus();
        }
    };

    return (
        <div
            className="session-prompt-backdrop"
            onClick={() => decide('cancel')}
            onKeyDown={handleKeyDown}
        >
            <div
                ref={dialogRef}
                className="session-prompt"
                role="dialog"
                aria-modal="true"
                aria-labelledby="session-prompt-title"
                aria-describedby="session-prompt-desc"
                onClick={event => event.stopPropagation()}
            >
                <h2 id="session-prompt-title" className="session-prompt-title">
                    {MESSAGES.SESSION_PROMPT_TITLE}
                </h2>
                <p id="session-prompt-desc" className="session-prompt-desc">
                    <strong>{request.songTitle}</strong>
                    {' — '}{request.artist}{' '}{MESSAGES.SESSION_NOW_PLAYING}
                    <br />
                    {MESSAGES.SESSION_PROMPT_QUESTION}
                </p>
                <div className="session-prompt-actions">
                    {request.canQueue && (
                        <button
                            ref={primaryRef}
                            className="session-btn session-btn-primary"
                            onClick={() => decide('queue')}
                        >
                            {MESSAGES.SESSION_PLAY_NEXT}
                        </button>
                    )}
                    <button
                        ref={request.canQueue ? undefined : primaryRef}
                        className={`session-btn ${request.canQueue ? '' : 'session-btn-primary'}`}
                        onClick={() => decide('new')}
                    >
                        {MESSAGES.SESSION_OPEN_NEW}
                    </button>
                    <button
                        className="session-btn"
                        onClick={() => decide('replace')}
                    >
                        {MESSAGES.SESSION_REPLACE}
                    </button>
                    <button
                        className="session-btn session-btn-ghost"
                        onClick={() => decide('cancel')}
                    >
                        {MESSAGES.SESSION_CANCEL}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionPrompt;
