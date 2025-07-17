import React, { createContext, useContext, useEffect, useState } from 'react';

export interface FollowUpLead {
  id: string;
  name: string;
  phone: string;
  state?: string;
}

interface FollowUpContextValue {
  followUps: FollowUpLead[];
  addFollowUp: (name: string, phone: string, state?: string) => void;
  deleteFollowUp: (id: string) => void;
  updateFollowUpState: (id: string, state: string) => void;
}

const FollowUpContext = createContext<FollowUpContextValue | undefined>(undefined);

const STORAGE_KEY = 'followUps';

// Helper: derive 2-letter state from phone area code (shortened map)
const deriveStateFromPhone = (num: string): string | undefined => {
  const match = num.match(/\(?([0-9]{3})\)?/);
  if (!match) return undefined;
  const ac = match[1];
  const areaMap: Record<string, string> = {
    '205': 'AL', '907': 'AK', '480': 'AZ', '479': 'AR', '209': 'CA',
    '303': 'CO', '203': 'CT', '302': 'DE', '305': 'FL', '404': 'GA',
    '808': 'HI', '208': 'ID', '217': 'IL', '317': 'IN', '319': 'IA',
    '316': 'KS', '502': 'KY', '225': 'LA', '207': 'ME', '301': 'MD',
    '617': 'MA', '313': 'MI', '612': 'MN', '601': 'MS', '636': 'MO',
    '406': 'MT', '308': 'NE', '702': 'NV', '603': 'NH', '201': 'NJ',
    '505': 'NM', '212': 'NY', '919': 'NC', '701': 'ND', '216': 'OH',
    '405': 'OK', '503': 'OR', '215': 'PA', '401': 'RI', '803': 'SC',
    '605': 'SD', '615': 'TN', '214': 'TX', '801': 'UT', '802': 'VT',
    '804': 'VA', '206': 'WA', '304': 'WV', '262': 'WI', '307': 'WY',
  };
  return areaMap[ac];
};

export const FollowUpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [followUps, setFollowUps] = useState<FollowUpLead[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as FollowUpLead[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(followUps));
  }, [followUps]);

  const generateId = () => Math.random().toString(36).substring(2, 10);

  const addFollowUp = (name: string, phone: string, state?: string) => {
    if (!name && !phone) return;
    const newLead: FollowUpLead = {
      id: generateId(),
      name: name.trim() || 'Unknown',
      phone: phone.trim(),
      state: (state || deriveStateFromPhone(phone))?.trim(),
    };
    setFollowUps((prev) => [...prev, newLead]);
  };

  const deleteFollowUp = (id: string) => {
    setFollowUps((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFollowUpState = (id: string, state: string) => {
    setFollowUps((prev) => prev.map((f) => (f.id === id ? { ...f, state } : f)));
  };

  return (
    <FollowUpContext.Provider value={{ followUps, addFollowUp, deleteFollowUp, updateFollowUpState }}>
      {children}
    </FollowUpContext.Provider>
  );
};

export const useFollowUps = () => {
  const ctx = useContext(FollowUpContext);
  if (!ctx) throw new Error('useFollowUps must be used within FollowUpProvider');
  return ctx;
}; 