import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

// Default fallback colors
const DEFAULT_COLORS = {
  'Positive Contact': '#38A169', // darker green
  'Negative Contact': '#E53E3E', // bright red
  SOLD: '#84CC16', // lime green
  'Employer Coverage': '#2196F3', // blue
  Brokie: '#FF9800', // orange
  'Buy Or Die': '#9C27B0', // purple
  'Unhealthy/Referred': '#795548', // brown
  Foreign: '#607D8B', // blue grey
  Quoted: '#00BCD4', // cyan
  Appointment: '#FFC107', // amber
  'No Contact': '#805AD5', // purple/indigo
  'No Disposition': '#9CA3AF', // grey (zinc-400)
  'Invalid/Disconnected': '#E91E63', // pink
  'Hung Up': '#9E9E9E', // grey
  Ghosted: '#E6F0F5', // light blueish-grey
  default: '#FFFFFF', // white
};

interface LeadContextType {
  notesMap: { [key: string]: string };
  dispositionsMap: { [key: string]: string };
  colorMap: { [key: string]: string };
  updateNotes: (leadId: string, notes: string) => void;
  updateDisposition: (leadId: string, disposition: string) => void;
  updateColor: (leadId: string, color: string) => void;
  getColorForDisposition: (disposition: string) => string;
}

const LeadContext = createContext<LeadContextType | null>(null);

export const LeadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data: customDispositionsData,
    isLoading: isLoadingDispositions,
    error: dispositionsError,
  } = useQuery<any>({
    queryKey: ['dispositions'],
    queryFn: async () => {
      try {
        // Check if user is authenticated before making API call
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No auth token found, skipping dispositions fetch');
          return [];
        }

        console.log('Fetching dispositions with auth token');
        const response = await axiosInstance.get('/api/dispositions');
        // Ensure we are returning the array of dispositions,
        // and handle cases where the structure might be different or an error occurs.
        if (response.data && Array.isArray(response.data.dispositions)) {
          return response.data.dispositions;
        } else if (
          response.data &&
          response.data.success &&
          Array.isArray(response.data.data?.dispositions)
        ) {
          // Handle if dispositions are nested under data.data.dispositions (less likely with current mock but good for robustness)
          return response.data.data.dispositions;
        } else {
          console.warn(
            'Fetched dispositions is not in the expected format (response.data.dispositions is not an array). Using empty array.',
            response.data
          );
          return []; // Return empty array if data is not as expected
        }
      } catch (error) {
        console.error('Error fetching dispositions:', error);
        return []; // Return empty array on error
      }
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // Only run the query if we have a token
    enabled: !!localStorage.getItem('token'),
  });

  // Use the fetched data, defaulting to an empty array if it's still loading or errored.
  const customDispositions: any[] = customDispositionsData || [];

  // Load initial state from localStorage
  const [notesMap, setNotesMap] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('notesMap');
    return saved ? JSON.parse(saved) : {};
  });

  const [dispositionsMap, setDispositionsMap] = useState<{
    [key: string]: string;
  }>(() => {
    const saved = localStorage.getItem('dispositionsMap');
    return saved ? JSON.parse(saved) : {};
  });

  const [colorMap, setColorMap] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('colorMap');
    return saved ? JSON.parse(saved) : {};
  });

  // Dynamic color mapping function that uses custom dispositions when available
  const getColorForDisposition = useCallback(
    (disposition: string): string => {
      if (!disposition || disposition.trim() === '') return DEFAULT_COLORS.default;

      // Ensure customDispositions is an array before calling .find()
      if (!Array.isArray(customDispositions)) {
        console.warn(
          'customDispositions is not an array in getColorForDisposition, returning default color.',
          customDispositions
        );
        return DEFAULT_COLORS.default;
      }

      const customDisp = customDispositions.find((d: any) => d.name === disposition);

      if (customDisp && customDisp.color) {
        return customDisp.color;
      }

      return DEFAULT_COLORS[disposition as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS.default;
    },
    [customDispositions]
  );

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('notesMap', JSON.stringify(notesMap));
  }, [notesMap]);

  useEffect(() => {
    localStorage.setItem('dispositionsMap', JSON.stringify(dispositionsMap));
  }, [dispositionsMap]);

  useEffect(() => {
    localStorage.setItem('colorMap', JSON.stringify(colorMap));
  }, [colorMap]);

  const updateNotes = useCallback((leadId: string, notes: string) => {
    setNotesMap((prev) => ({ ...prev, [leadId]: notes }));
  }, []);

  const updateDisposition = useCallback(
    (leadId: string, disposition: string) => {
      setDispositionsMap((prev) => ({ ...prev, [leadId]: disposition }));
      // Update color immediately when disposition changes
      const newColor = getColorForDisposition(disposition);
      setColorMap((prev) => ({ ...prev, [leadId]: newColor }));
    },
    [getColorForDisposition]
  );

  const updateColor = useCallback((leadId: string, color: string) => {
    setColorMap((prev) => ({ ...prev, [leadId]: color }));
  }, []);

  // Initialize and synchronize colors with dispositions when customDispositions change
  useEffect(() => {
    const newColorMap = { ...colorMap };
    let hasChanges = false;

    // Also check any dispositions stored in the leads that might not be in dispositionsMap yet
    Object.entries(dispositionsMap).forEach(([leadId, disposition]) => {
      const correctColor = getColorForDisposition(disposition);
      if (!colorMap[leadId] || colorMap[leadId] !== correctColor) {
        newColorMap[leadId] = correctColor;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setColorMap(newColorMap);
    }
  }, [dispositionsMap, customDispositions, getColorForDisposition, colorMap]);

  const value = {
    notesMap,
    dispositionsMap,
    colorMap,
    updateNotes,
    updateDisposition,
    updateColor,
    getColorForDisposition,
  };

  return <LeadContext.Provider value={value}>{children}</LeadContext.Provider>;
};

export function useLeads() {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
}
