/**
 * Símbolo da extensão: moldura de foco (cantos de câmera) com uma nota, em cor
 * única (currentColor). O ícone da extensão põe a nota dentro de um play; aqui o
 * play fica de fora para não ser confundido com o botão de tocar da player bar.
 */
const FocusIcon = ({ size = 24 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8" />
            <path d="M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8" />
            <path d="M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16" />
            <path d="M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
        </g>
        <path
            fill="currentColor"
            transform="translate(12 12) scale(0.55) translate(-12 -12)"
            d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
        />
    </svg>
);

export default FocusIcon;
