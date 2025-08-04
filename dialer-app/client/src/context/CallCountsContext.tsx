import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadCallCounts, saveCallCounts, CallCounts, getTodayKey } from '../utils/callCounts';

interface CallCountsContextProps {
  callCounts: CallCounts;
  uniqueCount: number;
  increment: (leadId: string) => void;
  remove: (leadId: string) => void;
}

const CallCountsContext = createContext<CallCountsContextProps | undefined>(undefined);

export const CallCountsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [callCounts, setCallCounts] = useState<CallCounts>(() => loadCallCounts());

  const increment = useCallback((leadId: string) => {
    setCallCounts((prev) => {
      const next = { ...prev, [leadId]: (prev[leadId] || 0) + 1 };
      saveCallCounts(next);
      return next;
    });
  }, []);

  const remove = useCallback((leadId: string) => {
    setCallCounts((prev) => {
      if (!(leadId in prev)) return prev;
      const { [leadId]: _removed, ...rest } = prev;
      saveCallCounts(rest);
      return rest;
    });
  }, []);

  const uniqueCount = Object.keys(callCounts).length;

  // rollover at next midnight
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const id = setTimeout(() => {
      setCallCounts(loadCallCounts());
    }, msUntilMidnight + 1000); // +1s buffer
    return () => clearTimeout(id);
  }, []);

  // Sync across tabs / windows
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== getTodayKey()) return;
      try {
        const parsed: CallCounts = e.newValue ? JSON.parse(e.newValue) : {};
        setCallCounts(parsed);
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <CallCountsContext.Provider value={{ callCounts, uniqueCount, increment, remove }}>
      {children}
    </CallCountsContext.Provider>
  );
};

export const useCallCountsContext = () => {
  const ctx = useContext(CallCountsContext);
  if (!ctx) throw new Error('useCallCountsContext must be used within CallCountsProvider');
  return ctx;
};

export default CallCountsProvider; 