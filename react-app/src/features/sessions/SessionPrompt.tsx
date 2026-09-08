import React, { useEffect, useRef, useState } from 'react';
import { sessionService } from '../../services/SessionService';
import type { SessionDecision, SessionPromptRequest } from '../../types/sessions';
import { MESSAGES } from '../../constants';
import './sessions.css';

/**
 * Diálogo de confirmação exibido quando um link externo chega com música
 * tocando: abrir em nova sessão, substituir a atual ou ignorar o link.
 */
const SessionPrompt: React.FC = () => {
    const [request, setRequest] = useState<SessionPromptRequest | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const primaryRef = useRef<HTMLButtonElement>(null);

    useEffect(() => sessionService.subscribe(setRequest), []);

    useEffect(() => {
        if (request) {
            primaryRef.current?.focus();
        }
    }, [request]);

    if (!request) {
        return null;
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
                    <button
                        ref={primaryRef}
                        className="session-btn session-btn-primary"
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
