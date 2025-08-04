import React, { useState, useEffect } from 'react';

interface CrocLoaderProps {
  size?: number; // px
}

const CrocLoader: React.FC<CrocLoaderProps> = ({ size = 48 }) => {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setUseFallback(true);
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeout);
  }, []);

  // Handle image load error
  const handleImageError = () => {
    console.warn('CROC LOADING.gif failed to load, trying video fallback');
    setImageError(true);
  };

  // Handle video load error
  const handleVideoError = () => {
    console.warn('CROC LOADING.mp4 failed to load, using emoji fallback');
    setVideoError(true);
  };

  // If we have errors or timeout, use emoji fallback
  if (useFallback || (imageError && videoError)) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.6,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        🐊
      </div>
    );
  }

  // Try video first if image failed
  if (imageError) {
    return (
      <video
        src="/ANIMATION/(NEW) CROC LOADING.mp4"
        width={size}
        height={size}
        style={{ display: 'block', margin: '0 auto', objectFit: 'contain', pointerEvents: 'none' }}
        muted
        loop
        playsInline
        onError={handleVideoError}
        onLoadStart={() => console.log('Loading video animation...')}
        onCanPlay={() => console.log('Video animation ready')}
      />
    );
  }

  // Default: try GIF first
  return (
  <img
    src="/ANIMATION/CROCLOAD.gif"
    width={size}
    height={size}
    style={{ display: 'block', margin: '0 auto', objectFit: 'contain', pointerEvents: 'none' }}
    alt="Loading..."
      onError={handleImageError}
      onLoad={() => console.log('GIF animation loaded successfully')}
  />
);
};

export default CrocLoader; 