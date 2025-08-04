import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface ZoomContextValue {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const ZoomContext = createContext<ZoomContextValue | undefined>(undefined);

export const ZoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [zoom, setZoom] = useState<number>(() => {
    const stored = localStorage.getItem('appZoom');
    return stored ? Number(stored) || 1 : 1;
  });

  useEffect(() => {
    localStorage.setItem('appZoom', String(zoom));
    // Update CSS custom property for fallback styles
    document.documentElement.style.setProperty('--zoom', String(zoom));

    // Native browser zoom (Chromium) for perfect layout scaling
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - zoom is non-standard but widely supported in Chromium
    (document.documentElement.style as any).zoom = String(zoom);
  }, [zoom]);

  const zoomIn = () => setZoom((p) => Math.min(p + 0.1, 3));
  const zoomOut = () => setZoom((p) => Math.max(p - 0.1, 0.5));
  const resetZoom = () => setZoom(1);

  return (
    <ZoomContext.Provider value={{ zoom, zoomIn, zoomOut, resetZoom }}>
      {children}
    </ZoomContext.Provider>
  );
};

export const useZoom = (): ZoomContextValue => {
  const ctx = useContext(ZoomContext);
  if (!ctx) throw new Error('useZoom must be used within ZoomProvider');
  return ctx;
}; 