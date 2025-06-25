import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';

// Constants
const NOTES_STORAGE_KEY_PREFIX = 'lead_notes_';
const NOTES_BACKUP_KEY_PREFIX = 'lead_notes_backup_';
// Primary backup key for all notes
const NOTES_MASTER_BACKUP_KEY = 'leads_notes_backup';
// Secondary backup key (in case primary is corrupted)
const NOTES_SECONDARY_BACKUP_KEY = 'leads_notes_backup_secondary';
// Session storage key for temporary storage
const NOTES_SESSION_KEY = 'session_leads_notes_backup';
const AUTO_SAVE_DEBOUNCE = 1500; // 1.5 seconds
// Synchronization interval (ms)
const SYNC_INTERVAL = 30000; // 30 seconds
// Max retry attempts for server sync
const MAX_RETRY_ATTEMPTS = 3;
// Unique id for this browser tab – used to ignore our own broadcast events
const TAB_ID = Math.random().toString(36).slice(2, 10);

interface NotesContextType {
  // Get notes for a specific lead/client
  getNotes: (leadId: string) => string;
  // Update notes for a specific lead/client
  updateNotes: (leadId: string, newNotes: string) => Promise<void>;
  // Save status
  saveStatus: { [leadId: string]: 'idle' | 'saving' | 'saved' | 'error' };
  // Get save timestamp
  getLastSaved: (leadId: string) => Date | null;
}

interface SaveTime {
  [leadId: string]: number;
}

// Create context with default values
const NotesContext = createContext<NotesContextType>({
  getNotes: () => '',
  updateNotes: async () => {},
  saveStatus: {},
  getLastSaved: () => null,
});

export const useNotes = () => useContext(NotesContext);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Store all notes in a single object keyed by leadId
  const [notesMap, setNotesMap] = useState<{ [leadId: string]: string }>({});
  // Keep a ref in sync so we can read without re-creating callbacks
  const notesMapRef = useRef(notesMap);
  useEffect(() => {
    notesMapRef.current = notesMap;
  }, [notesMap]);
  // Track save status for each note
  const [saveStatus, setSaveStatus] = useState<{
    [leadId: string]: 'idle' | 'saving' | 'saved' | 'error';
  }>({});
  // Track save times for display
  const [saveTime, setSaveTime] = useState<SaveTime>({});
  // Debounce timers for each lead
  const [timers, setTimers] = useState<{ [leadId: string]: NodeJS.Timeout }>({});
  // Retry counters for failed server syncs
  const [retryCounters, setRetryCounters] = useState<{
    [leadId: string]: number;
  }>({});
  // Track pending server updates
  const pendingUpdates = useRef<{ [leadId: string]: string }>({});
  // Flag to track if we're currently syncing with server
  const isSyncing = useRef(false);
  // Track the last successful server sync time
  const lastSyncTime = useRef<number>(Date.now());
  // Track last local edit timestamps to ignore stale echoes
  const lastLocalEditAtRef = useRef<{ [leadId: string]: number }>({});

  // This function uses multiple storage mechanisms to safely store notes
  const saveToStorage = useCallback(
    (leadId: string, notes: string) => {
      try {
        // Update individual lead note
        localStorage.setItem(`${NOTES_STORAGE_KEY_PREFIX}${leadId}`, notes);

        // Also update the master backup with all notes
        const updatedNotesMap = { ...notesMap, [leadId]: notes };

        // Save to primary backup
        localStorage.setItem(NOTES_MASTER_BACKUP_KEY, JSON.stringify(updatedNotesMap));

        // Save to secondary backup (every 3rd save)
        const saveCount = parseInt(localStorage.getItem('notes_save_count') || '0', 10);
        if (saveCount % 3 === 0) {
          localStorage.setItem(NOTES_SECONDARY_BACKUP_KEY, JSON.stringify(updatedNotesMap));
        }
        localStorage.setItem('notes_save_count', (saveCount + 1).toString());

        // Also save to session storage for tab persistence
        sessionStorage.setItem(NOTES_SESSION_KEY, JSON.stringify(updatedNotesMap));

        return true;
      } catch (error) {
        console.error('Error saving notes to storage:', error);
        return false;
      }
    },
    [notesMap]
  );

  // Load notes from all storage locations with fallbacks
  useEffect(() => {
    console.log('Loading notes from storage with fallbacks...');
    const loadedNotes: { [leadId: string]: string } = {};
    let sourceName = 'none';

    // Try loading from each source with fallbacks in priority order
    try {
      // 1. First check the master backup (primary source)
      const masterBackup = localStorage.getItem(NOTES_MASTER_BACKUP_KEY);
      if (masterBackup) {
        const parsedNotes = JSON.parse(masterBackup);
        if (parsedNotes && typeof parsedNotes === 'object' && Object.keys(parsedNotes).length > 0) {
          Object.assign(loadedNotes, parsedNotes);
          sourceName = 'master backup';
        }
      }
    } catch (error) {
      console.error('Error loading master backup notes:', error);
      // Continue to next source on error
    }

    try {
      // 2. Check the secondary backup if master failed or was empty
      if (Object.keys(loadedNotes).length === 0) {
        const secondaryBackup = localStorage.getItem(NOTES_SECONDARY_BACKUP_KEY);
        if (secondaryBackup) {
          const parsedNotes = JSON.parse(secondaryBackup);
          if (
            parsedNotes &&
            typeof parsedNotes === 'object' &&
            Object.keys(parsedNotes).length > 0
          ) {
            Object.assign(loadedNotes, parsedNotes);
            sourceName = 'secondary backup';
          }
        }
      }
    } catch (error) {
      console.error('Error loading secondary backup notes:', error);
      // Continue to next source on error
    }

    try {
      // 3. Check session storage
      if (Object.keys(loadedNotes).length === 0) {
        const sessionBackup = sessionStorage.getItem(NOTES_SESSION_KEY);
        if (sessionBackup) {
          const parsedNotes = JSON.parse(sessionBackup);
          if (
            parsedNotes &&
            typeof parsedNotes === 'object' &&
            Object.keys(parsedNotes).length > 0
          ) {
            Object.assign(loadedNotes, parsedNotes);
            sourceName = 'session storage';
          }
        }
      }
    } catch (error) {
      console.error('Error loading session storage notes:', error);
      // Continue to next source on error
    }

    try {
      // 4. Lastly, check individual notes which might be newer than bulk storage
      // Collect all localStorage items that start with our prefix
      const noteKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(NOTES_STORAGE_KEY_PREFIX)) {
          noteKeys.push(key);
        }
      }

      // Load each individual note and override the bulk notes if needed
      if (noteKeys.length > 0) {
        let individualNotesFound = 0;
        noteKeys.forEach((key) => {
          const leadId = key.replace(NOTES_STORAGE_KEY_PREFIX, '');
          const noteValue = localStorage.getItem(key);
          if (noteValue && noteValue.trim() !== '') {
            // Only override if individual note exists and isn't empty
            loadedNotes[leadId] = noteValue;
            individualNotesFound++;
          }
        });

        if (individualNotesFound > 0) {
          sourceName += ' + individual notes';
        }
      }
    } catch (error) {
      console.error('Error loading individual notes:', error);
    }

    // Apply the loaded notes to state if we found any
    if (Object.keys(loadedNotes).length > 0) {
      console.log(`Loaded ${Object.keys(loadedNotes).length} notes from ${sourceName}`);
      setNotesMap((prevNotes) => ({
        ...loadedNotes,
        ...prevNotes, // Keep any notes already in state (they might be newer)
      }));
    } else {
      console.warn('No notes found in any storage location');
    }
  }, []);

  // Function to get notes for a specific lead with validation
  const getNotes = useCallback(
    (leadId: string): string => {
      if (!leadId) return '';

      // First check our ref state (fastest source, stable across renders)
      if (notesMapRef.current[leadId]) {
        return notesMapRef.current[leadId];
      }

      // Check pending updates (not yet saved to state)
      if (pendingUpdates.current[leadId]) {
        return pendingUpdates.current[leadId];
      }

      // Check localStorage as a fallback
      try {
        const localNotes = localStorage.getItem(`${NOTES_STORAGE_KEY_PREFIX}${leadId}`);
        if (localNotes) {
          // Update our state with the found notes
          setNotesMap((prev) => ({
            ...prev,
            [leadId]: localNotes,
          }));
          return localNotes;
        }
      } catch (error) {
        console.error('Error retrieving notes from localStorage:', error);
      }

      // Try other backup sources if direct lookup failed
      try {
        const masterBackup = localStorage.getItem(NOTES_MASTER_BACKUP_KEY);
        if (masterBackup) {
          const parsedNotes = JSON.parse(masterBackup);
          if (parsedNotes && parsedNotes[leadId]) {
            // Update our state with the found notes
            setNotesMap((prev) => ({
              ...prev,
              [leadId]: parsedNotes[leadId],
            }));
            return parsedNotes[leadId];
          }
        }
      } catch (error) {
        console.error('Error checking master backup for notes:', error);
      }

      return '';
    },
    []
  );

  // Function to update notes both locally and on the server with data validation
  const updateNotes = useCallback(
    async (leadId: string, newNotes: string): Promise<void> => {
      if (!leadId) return;

      // Skip if value unchanged (prevents duplicate PUTs on same text)
      const currentNotes = notesMapRef.current[leadId] ?? '';
      if (currentNotes === newNotes) {
        return;
      }

      // Add to pending updates reference
      pendingUpdates.current[leadId] = newNotes;

      // Update local state immediately for responsive UI
      setNotesMap((prev) => ({
        ...prev,
        [leadId]: newNotes,
      }));

      // Persist to storage optimistically (lightweight, still debounced for backups)
      saveToStorage(leadId, newNotes);

      // Clear any existing timer for this leadId
      if (timers[leadId]) {
        clearTimeout(timers[leadId]);
      }

      // Set status to saving
      setSaveStatus((prev) => ({
        ...prev,
        [leadId]: 'saving',
      }));

      // Create a new debounce timer for server sync
      const timer = setTimeout(async () => {
        try {
          // Persist to localStorage just before hitting server to ensure we write at most once per debounce window
          saveToStorage(leadId, newNotes);

          // Send update to server (allowing blank/cleared notes)
          const response = await axiosInstance.put(`/api/leads/${leadId}`, {
            notes: newNotes,
          });

          // Update status on success
          if (response.status === 200) {
            setSaveStatus((prev) => ({
              ...prev,
              [leadId]: 'saved',
            }));
            setSaveTime((prev) => ({
              ...prev,
              [leadId]: Date.now(),
            }));

            // Reset retry counter on success
            setRetryCounters((prev) => ({
              ...prev,
              [leadId]: 0,
            }));

            // Mark last successful sync time
            lastSyncTime.current = Date.now();

            // Remove from pending updates
            const { [leadId]: _, ...remaining } = pendingUpdates.current;
            pendingUpdates.current = remaining;

            // Dispatch event for other components that might be interested
            const event = new CustomEvent('notesUpdated', {
              detail: { leadId, notes: newNotes, origin: TAB_ID, updatedAt: Date.now() },
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          console.error('Error saving notes to server:', error);

          // Update retry counter
          const currentRetries = (retryCounters[leadId] || 0) + 1;
          setRetryCounters((prev) => ({
            ...prev,
            [leadId]: currentRetries,
          }));

          // Set error status
          setSaveStatus((prev) => ({
            ...prev,
            [leadId]: 'error',
          }));

          // If we haven't exceeded max retries, schedule another attempt
          if (currentRetries < MAX_RETRY_ATTEMPTS) {
            // Exponential backoff for retries (1.5s, 3s, 6s)
            const backoffTime = AUTO_SAVE_DEBOUNCE * Math.pow(2, currentRetries - 1);
            setTimeout(() => {
              updateNotes(leadId, newNotes);
            }, backoffTime);
          }
        }
      }, AUTO_SAVE_DEBOUNCE);

      // Store the timer
      setTimers((prev) => ({
        ...prev,
        [leadId]: timer,
      }));

      // Record local edit timestamp so we can ignore stale websocket echoes
      lastLocalEditAtRef.current[leadId] = Date.now();
    },
    [notesMap, timers, retryCounters, saveToStorage]
  );

  // Function to get the last saved timestamp
  const getLastSaved = useCallback(
    (leadId: string): Date | null => {
      const timestamp = saveTime[leadId];
      return timestamp ? new Date(timestamp) : null;
    },
    [saveTime]
  );

  // Set up periodic sync check to ensure all pending notes get saved
  useEffect(() => {
    const syncInterval = setInterval(() => {
      // Skip if we're already syncing or there are no pending updates
      if (isSyncing.current || Object.keys(pendingUpdates.current).length === 0) {
        return;
      }

      // Mark that we're starting a sync
      isSyncing.current = true;

      // Check if there are any notes that haven't been synced to the server
      const pendingLeadIds = Object.keys(pendingUpdates.current);
      console.log(`Checking ${pendingLeadIds.length} pending note updates...`);

      // Process each pending update
      Promise.all(
        pendingLeadIds.map(async (leadId) => {
          const notes = pendingUpdates.current[leadId];
          if (!notes) return;

          try {
            const response = await axiosInstance.put(`/api/leads/${leadId}`, {
              notes: notes,
            });

            if (response.status === 200) {
              console.log(`Successfully synced notes for lead ${leadId}`);
              setSaveStatus((prev) => ({
                ...prev,
                [leadId]: 'saved',
              }));
              setSaveTime((prev) => ({
                ...prev,
                [leadId]: Date.now(),
              }));

              // Remove from pending updates
              const { [leadId]: _, ...remaining } = pendingUpdates.current;
              pendingUpdates.current = remaining;

              // Reset retry counter
              setRetryCounters((prev) => ({
                ...prev,
                [leadId]: 0,
              }));
            }
          } catch (error) {
            console.error(`Error syncing notes for lead ${leadId}:`, error);
          }
        })
      ).finally(() => {
        // Mark that we're done syncing
        isSyncing.current = false;
      });
    }, SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, [timers]);

  // Listen for note updates from other components/windows
  useEffect(() => {
    const handleNotesUpdated = (e: CustomEvent) => {
      const { leadId, notes, origin, updatedAt } = e.detail || {};
      // Ignore our own events
      if (origin === TAB_ID) return;
      // Ignore stale echoes (earlier than our last local edit for this lead)
      if (
        updatedAt !== undefined &&
        lastLocalEditAtRef.current[leadId] !== undefined &&
        updatedAt <= lastLocalEditAtRef.current[leadId] + 100 // small buffer
      ) {
        return;
      }
      if (leadId && notes !== undefined) {
        // Only update if the notes have actually changed
        const currentNotes = notesMap[leadId] || '';
        if (notes !== currentNotes) {
          console.log(`Received notes update event for lead ${leadId}`);
          setNotesMap((prev) => ({
            ...prev,
            [leadId]: notes,
          }));

          // Also save to storage
          saveToStorage(leadId, notes);
        }
      }
    };

    window.addEventListener('notesUpdated', handleNotesUpdated as EventListener);

    return () => {
      window.removeEventListener('notesUpdated', handleNotesUpdated as EventListener);
    };
  }, [notesMap, saveToStorage]);

  // Add data validation check on window focus to ensure notes aren't lost
  useEffect(() => {
    const handleWindowFocus = () => {
      // Check if we need to restore any notes from storage
      try {
        const masterBackup = localStorage.getItem(NOTES_MASTER_BACKUP_KEY);
        if (masterBackup) {
          const parsedNotes = JSON.parse(masterBackup);
          if (parsedNotes && typeof parsedNotes === 'object') {
            // Check if any backed up notes are missing or empty in our current state
            let restoredCount = 0;
            Object.entries(parsedNotes).forEach(([leadId, notes]) => {
              const currentNotes = notesMap[leadId] || '';
              // Only restore if we have notes in backup but not in current state
              if (
                notes &&
                typeof notes === 'string' &&
                notes.trim() !== '' &&
                currentNotes.trim() === ''
              ) {
                setNotesMap((prev) => ({
                  ...prev,
                  [leadId]: notes as string,
                }));
                restoredCount++;
              }
            });

            if (restoredCount > 0) {
              console.log(`Restored ${restoredCount} missing notes on window focus`);
            }
          }
        }
      } catch (error) {
        console.error('Error checking notes on window focus:', error);
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [notesMap]);

  // Add periodic check to ensure all backups are in sync
  useEffect(() => {
    const backupSyncInterval = setInterval(() => {
      try {
        // Create a backup of all notes in state
        if (Object.keys(notesMap).length > 0) {
          localStorage.setItem(NOTES_MASTER_BACKUP_KEY, JSON.stringify(notesMap));
          console.log(`Backup sync complete: ${Object.keys(notesMap).length} notes synchronized`);
        }
      } catch (error) {
        console.error('Error during backup sync:', error);
      }
    }, 60000); // Every minute

    return () => clearInterval(backupSyncInterval);
  }, [notesMap]);

  const contextValue = {
    getNotes,
    updateNotes,
    saveStatus,
    getLastSaved,
  };

  return <NotesContext.Provider value={contextValue}>{children}</NotesContext.Provider>;
};
