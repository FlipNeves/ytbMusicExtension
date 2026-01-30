import React from 'react';

const LyricsSkeleton: React.FC = () => {
    const lines = [85, 70, 90, 60, 80, 75, 65, 95];

    return (
        <div className="lyrics-skeleton" role="status" aria-label="Carregando letra...">
            {lines.map((width, index) => (
                <div
                    key={index}
                    className="skeleton-line"
                    style={{
                        width: `${width}%`,
                        animationDelay: `${index * 0.1}s`,
                    }}
                />
            ))}
        </div>
    );
};

export default LyricsSkeleton;
