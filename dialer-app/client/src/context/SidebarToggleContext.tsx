import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarCtxProps {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const SidebarToggleContext = createContext<SidebarCtxProps | undefined>(undefined);

export const useSidebarToggle = (): SidebarCtxProps => {
  const ctx = useContext(SidebarToggleContext);
  if (!ctx) throw new Error('useSidebarToggle must be inside provider');
  return ctx;
};

export const SidebarToggleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const persisted = localStorage.getItem('sidebar_open');
    return persisted ? persisted === 'true' : false;
  });

  const toggle = () => setIsOpen((prev) => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  useEffect(() => {
    localStorage.setItem('sidebar_open', String(isOpen));
  }, [isOpen]);

  return (
    <SidebarToggleContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </SidebarToggleContext.Provider>
  );
}; 