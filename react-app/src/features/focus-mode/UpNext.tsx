import React from 'react';

interface UpNextProps {
    nextTitle: string;
    nextArtist: string;
}

const UpNext: React.FC<UpNextProps> = ({ nextTitle, nextArtist }) => {
    return (
        <div className="focus-next">
            <h3>A SEGUIR</h3>
            <div className="next-track-card">
                <div className="next-info">
                    <span className="next-title">{nextTitle}</span>
                    <span className="next-artist">{nextArtist}</span>
                </div>
            </div>
        </div>
    );
};

export default UpNext;
