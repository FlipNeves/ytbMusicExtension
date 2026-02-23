import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './styles/browser-nav.css';

const BrowserNavButtons: React.FC = () => {
    const [target, setTarget] = useState<Element | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const leftContent = document.querySelector('ytmusic-nav-bar .left-content') || document.querySelector('ytmusic-nav-bar');
            if (leftContent && !document.getElementById('btn-browser-nav-container')) {
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
                clearInterval(interval);
            } else {
                const rightControls = document.querySelector('.right-controls-buttons');
                if (rightControls && !document.getElementById('btn-browser-nav-container')) {
                    const btnContainer = document.createElement('div');
                    btnContainer.id = 'btn-browser-nav-container';
                    btnContainer.className = 'browser-nav-buttons-container browser-nav-right';
                    rightControls.prepend(btnContainer);
                    setTarget(btnContainer);
                    clearInterval(interval);
                }
            }
        }, 1000);

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
