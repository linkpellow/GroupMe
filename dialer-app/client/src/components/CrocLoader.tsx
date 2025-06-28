import React from 'react';

interface CrocLoaderProps {
  size?: number; // px
}

const CrocLoader: React.FC<CrocLoaderProps> = ({ size = 48 }) => (
  <img
    src="/ANIMATION/CROCLOAD.gif"
    width={size}
    height={size}
    style={{ display: 'block', margin: '0 auto', objectFit: 'contain', pointerEvents: 'none', border: '2px solid green', background: 'white', zIndex: 9999 }}
    alt="Loading..."
  />
);

export default CrocLoader; 