import React, { createContext, useContext, useState } from 'react';

interface FollowUpUIContextValue {
  isVisible: boolean;
  toggleVisibility: () => void;
}

const FollowUpUIContext = createContext<FollowUpUIContextValue | undefined>(undefined);

export const FollowUpUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialise from localStorage; default to *hidden* (false) on first visit.
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('followup_strip_visible');
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return false; // hidden by default
  });

  const toggleVisibility = () => {
    setIsVisible((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('followup_strip_visible', String(next));
        }
      } catch {
        /* ignore storage errors (e.g., quota) */
      }
      return next;
    });
  };

  return (
    <FollowUpUIContext.Provider value={{ isVisible, toggleVisibility }}>
      {children}
    </FollowUpUIContext.Provider>
  );
};

export const useFollowUpUI = () => {
  const context = useContext(FollowUpUIContext);
  if (!context) {
    throw new Error('useFollowUpUI must be used within a FollowUpUIProvider');
  }
  return context;
}; 