import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './styles/browser-nav.css';

const BrowserNavButtons: React.FC = () => {
    const [target, setTarget] = useState<Element | null>(null);

    useEffect(() => {
        // Mantém o intervalo ativo: se a SPA do YTM recriar a nav bar,
        // o container é recriado e o portal volta a renderizar.
        const ensureContainer = () => {
            const existing = document.getElementById('btn-browser-nav-container');
            if (existing?.isConnected) return;

            const leftContent = document.querySelector('ytmusic-nav-bar .left-content') || document.querySelector('ytmusic-nav-bar');
            if (leftContent) {
                const btnContainer = document.createElement('div');
                btnContainer.id = 'btn-browser-nav-container';
                btnContainer.className = 'browser-nav-buttons-container';

                if (leftContent.classList.contains('left-content')) {
                    const secondItem = leftContent.children[1];
                    leftContent.insertBefore(btnContainer, secondItem);
                } else {
                    leftContent.appendChild(btnContainer);
                }
                setTarget(btnContainer);
                return;
            }

            const rightControls = document.querySelector('.right-controls-buttons');
            if (rightControls) {
                const btnContainer = document.createElement('div');
                btnContainer.id = 'btn-browser-nav-container';
                btnContainer.className = 'browser-nav-buttons-container browser-nav-right';
                rightControls.prepend(btnContainer);
                setTarget(btnContainer);
            }
        };

        ensureContainer();
        const interval = setInterval(ensureContainer, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!target) {
        return null;
    }

    return ReactDOM.createPortal(
        <>
            <button
                className="browser-nav-btn"
                title="Voltar"
                aria-label="Voltar no histórico"
                onClick={() => window.history.back()}
            >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
            </button>
            <button
                className="browser-nav-btn"
                title="Avançar"
                aria-label="Avançar no histórico"
                onClick={() => window.history.forward()}
            >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
            </button>
        </>,
        target
    );
};

export default BrowserNavButtons;
