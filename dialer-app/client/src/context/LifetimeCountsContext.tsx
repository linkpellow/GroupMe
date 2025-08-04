import React, { createContext, useContext, useEffect, useState } from "react";
import {
  LifetimeCounts,
  loadLifetimeCounts,
  subscribeLifetimeCounts,
  incrementLifetimeCount,
  normalizePhone,
} from "../utils/lifetimeCounts";

interface LifetimeCountsContextValue {
  counts: LifetimeCounts;
  /**
   * Increment the lifetime dial count for the given phone number (any format).
   * Returns the new total.
   */
  incrementCount: (rawPhone: string) => number;
}

const LifetimeCountsContext = createContext<LifetimeCountsContextValue>({
  counts: {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  incrementCount: () => 0,
});

export const useLifetimeCounts = () => useContext(LifetimeCountsContext);

const LifetimeCountsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [counts, setCounts] = useState<LifetimeCounts>(() => loadLifetimeCounts());

  // Increment helper keeps React state, localStorage, and BroadcastChannel in sync
  const incrementCount = React.useCallback((rawPhone: string): number => {
    const total = incrementLifetimeCount(rawPhone);
    const phone = normalizePhone(rawPhone);
    setCounts((prev) => ({ ...prev, [phone]: total }));
    return total;
  }, []);

  useEffect(() => {
    // Subscribe early so we catch increments that happen immediately after page load
    const unsubscribe = subscribeLifetimeCounts((c) => setCounts({ ...c }));
    return unsubscribe;
  }, []);

  return (
    <LifetimeCountsContext.Provider value={{ counts, incrementCount }}>
      {children}
    </LifetimeCountsContext.Provider>
  );
};

export default LifetimeCountsProvider; 