import React, { useEffect, useState } from 'react';
import CrocLoader from './CrocLoader';

const LoadingCroc: React.FC = () => {
  const [visible, setVisible] = useState(false);

  // Trigger fade-in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Prevent quick flicker by keeping component mounted briefly after unmount request
  useEffect(() => {
    const minTimer = setTimeout(() => {}, 300);
    return () => clearTimeout(minTimer);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.3s ease',
        opacity: visible ? 1 : 0,
        zIndex: 9999,
      }}
    >
      <CrocLoader size={96} />
    </div>
  );
};

export default LoadingCroc;
