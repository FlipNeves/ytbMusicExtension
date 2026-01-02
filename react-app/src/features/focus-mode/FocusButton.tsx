import React from 'react';
import ReactDOM from 'react-dom';

interface FocusButtonProps {
    onClick: () => void;
}

const FocusButton: React.FC<FocusButtonProps> = ({ onClick }) => {
    const [target, setTarget] = React.useState<Element | null>(null);

    React.useEffect(() => {
        const interval = setInterval(() => {
            const rightControls = document.querySelector('.right-controls-buttons');
            if (rightControls && !document.getElementById('btn-cinema-mode')) {
                const btnContainer = document.createElement('div');
                btnContainer.id = 'btn-cinema-mode-container';
                rightControls.prepend(btnContainer);
                setTarget(btnContainer);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!target) {
        return null;
    }

    return ReactDOM.createPortal(
        <button id="btn-cinema-mode" title="Modo Foco" onClick={onClick}>
            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path></svg>
        </button>,
        target
    );
};

export default FocusButton;
