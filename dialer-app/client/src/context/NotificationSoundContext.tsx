import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

interface NotificationSoundContextValue {
  soundEnabled: boolean;
  toggleSound: () => void;
}

const NotificationSoundContext = createContext<NotificationSoundContextValue | undefined>(undefined);

export const NotificationSoundProvider = ({ children }: { children: ReactNode }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('soundEnabled');
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    try {
      localStorage.setItem('soundEnabled', String(soundEnabled));
    } catch (_) {
      // Ignore storage errors (e.g., quota exceeded, SSR)
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => setSoundEnabled((prev) => !prev), []);

  const value: NotificationSoundContextValue = {
    soundEnabled,
    toggleSound,
  };

  return (
    <NotificationSoundContext.Provider value={value}>
      {children}
    </NotificationSoundContext.Provider>
  );
};

export const useNotificationSound = (): NotificationSoundContextValue => {
  const ctx = useContext(NotificationSoundContext);
  if (!ctx) {
    throw new Error('useNotificationSound must be used within NotificationSoundProvider');
  }
  return ctx;
}; 