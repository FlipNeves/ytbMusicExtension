import React from 'react';

const Visualizer = React.forwardRef<HTMLDivElement>((_props, ref) => {
    return (
        <div className="focus-visualizer" ref={ref}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
        </div>
    );
});

export default Visualizer;
