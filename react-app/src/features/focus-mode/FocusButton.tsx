import React from 'react';
import ReactDOM from 'react-dom';
import { MESSAGES, SELECTORS } from '../../constants';
import { watchDom } from '../../services/DomWatcher';
import FocusIcon from './FocusIcon';

interface FocusButtonProps {
    onClick: () => void;
}

const FocusButton: React.FC<FocusButtonProps> = ({ onClick }) => {
    const [target, setTarget] = React.useState<Element | null>(null);

    // Se a SPA do YTM recriar a barra de controles, o container é recriado
    // e o portal volta a renderizar.
    React.useEffect(() => watchDom(() => {
        const existing = document.getElementById('btn-cinema-mode-container');
        if (existing?.isConnected) return;

        const rightControls = document.querySelector(SELECTORS.RIGHT_CONTROLS);
        if (!rightControls) return;

        const btnContainer = document.createElement('div');
        btnContainer.id = 'btn-cinema-mode-container';
        rightControls.prepend(btnContainer);
        setTarget(btnContainer);
    }), []);

    if (!target) {
        return null;
    }

    return ReactDOM.createPortal(
        <button id="btn-cinema-mode" title={MESSAGES.FOCUS_MODE} aria-label={MESSAGES.FOCUS_MODE} onClick={onClick}>
            <FocusIcon />
        </button>,
        target
    );
};

export default FocusButton;
