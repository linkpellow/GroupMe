import React, { useState, useEffect, useRef } from 'react';
import StateIcon from './StateIcon';
import { parseFollowUpString } from '../utils/parseFollowUp';
import { useFollowUps } from '../context/FollowUpContext';

interface DailyGoal {
  id: string;
  text: string;
  timestamp: number;
  completed: boolean;
  time?: string; // Changed from dueDate to just time
}

interface FollowUpLead {
  id: string; // uuid
  name: string;
  phone: string;
  state?: string;
}

interface DailyGoalsState {
  notes: DailyGoal[];
  createdAt: string;
  followUps?: FollowUpLead[];
}

// Storage key for persisting reminders
const LOCAL_STORAGE_KEY = 'daily_goals_state_2024';

// Simple id generator for local items
const generateId = () => Math.random().toString(36).substring(2, 10);

// Get today's date in YYYY-MM-DD format
const getTodayString = () => new Date().toISOString().split('T')[0];

// Format time for display - simplified to just show the time
const formatTime = (timeString?: string): string => {
  if (!timeString) return '';

  try {
    // Parse the 24-hour format time (HH:MM)
    const [hours, minutes] = timeString.split(':').map((num) => parseInt(num, 10));

    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM

    // Format as "2:00 PM"
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return timeString; // Return original if parsing fails
  }
};

// Clear old reminder data to fix persistence issues
try {
  localStorage.removeItem('crokodial_daily_goals');
  localStorage.removeItem('crokodial_reminders_v2');
} catch {
  /* ignore */
}

// Helper: derive 2-letter state from phone area code.
const deriveStateFromPhone = (num: string): string | undefined => {
  const match = num.match(/\(?([0-9]{3})\)?/);
  if (!match) return undefined;
  const ac = match[1];
  const areaMap: Record<string, string> = {
    '205': 'AL', '251': 'AL', '256': 'AL', '334': 'AL', '938': 'AL',
    '907': 'AK',
    '480': 'AZ', '520': 'AZ', '602': 'AZ', '623': 'AZ', '928': 'AZ',
    '479': 'AR', '501': 'AR', '870': 'AR',
    '209': 'CA', '213': 'CA', '279': 'CA', '310': 'CA', '323': 'CA', '408': 'CA', '415': 'CA', '424': 'CA', '442': 'CA', '530': 'CA', '559': 'CA', '562': 'CA', '619': 'CA', '626': 'CA', '650': 'CA', '657': 'CA', '661': 'CA', '669': 'CA', '707': 'CA', '714': 'CA', '747': 'CA', '760': 'CA', '805': 'CA', '818': 'CA', '820': 'CA', '831': 'CA', '858': 'CA', '909': 'CA', '916': 'CA', '925': 'CA', '949': 'CA', '951': 'CA',
    '303': 'CO', '719': 'CO', '720': 'CO', '970': 'CO',
    '203': 'CT', '475': 'CT', '860': 'CT', '959': 'CT',
    '302': 'DE',
    '239': 'FL', '305': 'FL', '321': 'FL', '352': 'FL', '386': 'FL', '407': 'FL', '561': 'FL', '727': 'FL', '754': 'FL', '772': 'FL', '786': 'FL', '813': 'FL', '850': 'FL', '863': 'FL', '904': 'FL', '941': 'FL', '954': 'FL',
    // Texas area codes
    '210': 'TX', '214': 'TX', '254': 'TX', '281': 'TX', '325': 'TX', '346': 'TX', '361': 'TX', '409': 'TX', '430': 'TX', '432': 'TX', '469': 'TX', '512': 'TX', '682': 'TX', '713': 'TX', '726': 'TX', '737': 'TX', '806': 'TX', '830': 'TX', '832': 'TX', '903': 'TX', '915': 'TX', '936': 'TX', '940': 'TX', '956': 'TX', '972': 'TX', '979': 'TX',
  };
  return areaMap[ac];
};

const DailyGoals: React.FC = () => {
  // State to track which reminder is being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTime, setEditTime] = useState<string>(''); // Changed from editDueDate
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null); // Add ref for the edit container
  const [collapsed, setCollapsed] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Initialize state with data from localStorage or with defaults
  const [state, setState] = useState<DailyGoalsState>(() => {
    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState) as DailyGoalsState;

        // Add completed property to any existing notes that don't have it
        const updatedNotes = parsedState.notes.map((note) => ({
          ...note,
          completed: note.completed !== undefined ? note.completed : false,
        }));

        return {
          ...parsedState,
          notes: updatedNotes,
        };
      }

      // If no saved state, return fresh state
      return {
        notes: [], // Start with empty notes
        createdAt: getTodayString(),
      };
    } catch {
      return {
        notes: [],
        createdAt: getTodayString(),
      };
    }
  });

  // Check if we need to reset for a new day
  useEffect(() => {
    const today = getTodayString();

    // Only reset if we're on a new day
    if (state.createdAt !== today) {
      setState({
        notes: [], // Reset to empty array
        createdAt: today,
      });
    }
  }, []); // Only run this once on component mount

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  // Focus input field when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      // Place cursor at the end of text
      const length = editText.length;
      editInputRef.current.setSelectionRange(length, length);
    }
  }, [editingId, editText]);

  // Function to add a new goal
  const addGoal = (text: string = '', time?: string) => {
    setState((prevState) => ({
      ...prevState,
      notes: [
        ...prevState.notes,
        {
          id: Date.now().toString(),
          text: text.trim() || '',
          timestamp: Date.now(),
          completed: false,
          time,
        },
      ],
    }));

    // If adding an empty goal, start editing it immediately
    if (!text.trim()) {
      setTimeout(() => {
        const newId = Date.now().toString();
        startEditing(newId, '', time || '');
      }, 100);
    }
  };

  // Function to toggle completion state
  const toggleCompleted = (id: string) => {
    setState((prevState) => ({
      ...prevState,
      notes: prevState.notes.map((note) =>
        note.id === id ? { ...note, completed: !note.completed } : note
      ),
    }));
  };

  // Function to start editing a goal
  const startEditing = (id: string, currentText: string, currentTime?: string) => {
    setEditingId(id);
    setEditText(currentText);
    setEditTime(currentTime || '');
  };

  // Function to save edited goal
  const saveEdit = () => {
    if (!editingId) return;

    setState((prevState) => ({
      ...prevState,
      notes: prevState.notes.map((note) =>
        note.id === editingId
          ? {
              ...note,
              text: editText.trim() || '',
              time: editTime || undefined,
            }
          : note
      ),
    }));

    setEditingId(null);
  };

  // Function to handle blur events from the edit area
  const handleBlur = (e: React.FocusEvent) => {
    // Check if the new focus target is within our edit container
    if (editContainerRef.current && editContainerRef.current.contains(e.relatedTarget as Node)) {
      // If we're still inside the container, don't save yet
      return;
    }

    // Otherwise, save the edit
    saveEdit();
  };

  // Function to handle edit cancellation
  const cancelEdit = () => {
    setEditingId(null);
  };

  // Handle key presses in edit mode
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only handle Escape key - textarea handles multiline with Enter
    if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter to save
      saveEdit();
    }
  };

  // Function to delete a goal
  const deleteGoal = (id: string) => {
    if (!id) {
      return;
    }

    setState((prevState) => {
      // Create the new state with the goal filtered out
      const newState = {
        ...prevState,
        notes: prevState.notes.filter((note) => note.id !== id),
      };

      // Explicitly save to localStorage immediately
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
      } catch {
        /* ignore */
      }

      return newState;
    });
  };

  // Function to add a booking goal
  const { addFollowUp } = useFollowUps();

  const addBooking = (name: string, number: string) => {
    addGoal(`Booked: ${name} - ${number}`);
  };

  // ---------------- Follow-up leads helpers ------------------
  const deleteFollowUp = (id: string) => {
    setState((prev) => ({
      ...prev,
      followUps: (prev.followUps || []).filter((fl) => fl.id !== id),
    }));
  };

  // Update state abbreviation on a follow-up lead
  const updateFollowUpState = (id: string) => {
    const input = window.prompt('Enter 2-letter state abbreviation (e.g., FL):');
    if (!input) return;
    const abbr = input.trim().toUpperCase().slice(0, 2);
    if (!/^[A-Z]{2}$/.test(abbr)) {
      alert('Please enter a valid 2-letter state abbreviation');
      return;
    }
    setState((prev) => ({
      ...prev,
      followUps: (prev.followUps || []).map((fl) =>
        fl.id === id ? { ...fl, state: abbr } : fl
      ),
    }));
  };

  // Remove all follow-up leads in a single action
  const clearAllFollowUps = () => {
    if (!state.followUps?.length) return;
    const confirmed = window.confirm('Delete all follow-up leads?');
    if (!confirmed) return;
    setState((prev) => ({ ...prev, followUps: [] }));
  };

  // --- Time-zone helper ---
  const stateToIana: Record<string, string> = {
    AL: 'America/Chicago',
    AR: 'America/Chicago',
    IA: 'America/Chicago',
    IL: 'America/Chicago',
    KS: 'America/Chicago',
    LA: 'America/Chicago',
    MN: 'America/Chicago',
    MO: 'America/Chicago',
    MS: 'America/Chicago',
    OK: 'America/Chicago',
    WI: 'America/Chicago',
    TX: 'America/Chicago',
    SD: 'America/Chicago',
    ND: 'America/Chicago',
    GA: 'America/New_York',
    FL: 'America/New_York',
    SC: 'America/New_York',
    NC: 'America/New_York',
    VA: 'America/New_York',
    WV: 'America/New_York',
    KY: 'America/New_York',
    OH: 'America/New_York',
    MI: 'America/New_York',
    IN: 'America/Indiana/Indianapolis',
    NY: 'America/New_York',
    NJ: 'America/New_York',
    PA: 'America/New_York',
    MD: 'America/New_York',
    DE: 'America/New_York',
    ME: 'America/New_York',
    VT: 'America/New_York',
    NH: 'America/New_York',
    MA: 'America/New_York',
    CT: 'America/New_York',
    RI: 'America/New_York',
    CO: 'America/Denver',
    MT: 'America/Denver',
    NM: 'America/Denver',
    UT: 'America/Denver',
    WY: 'America/Denver',
    AZ: 'America/Phoenix',
    NV: 'America/Los_Angeles',
    CA: 'America/Los_Angeles',
    OR: 'America/Los_Angeles',
    WA: 'America/Los_Angeles',
    ID: 'America/Boise',
    AK: 'America/Anchorage',
    HI: 'Pacific/Honolulu',
  };

  const getCurrentTimeLabel = (stateAbbr?: string): string => {
    const tz = stateAbbr && stateToIana[stateAbbr.toUpperCase()];
    try {
      const locale = 'en-US';
      const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
        timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const formatter = new Intl.DateTimeFormat(locale, options);
      // e.g., "2:18 AM EDT"
      return formatter.format(new Date());
    } catch {
      return '';
    }
  };

  // Create a global helper to append goals
  useEffect(() => {
    // Expose helper function globally
    (window as any).appendDailyGoal = (text: string) => {
      const parsed = parseFollowUpString(text);
      if (parsed) {
        addFollowUp(parsed.name, parsed.phone, parsed.state);
      } else {
        addGoal(text);
      }
    };

    (window as any).addBookingGoal = (name: string, number: string) => {
      addBooking(name, number);
    };

    (window as any).addFollowUpLead = (name: string, phone: string, state?: string) => {
      addFollowUp(name, phone, state);
    };

    return () => {
      // Clean up global functions when component unmounts
      delete (window as any).appendDailyGoal;
      delete (window as any).addBookingGoal;
      delete (window as any).addFollowUpLead;
    };
  }, [addFollowUp]);

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      alert('Phone number copied to clipboard');
    } catch {
      window.prompt('Copy phone number:', text);
    }
  };

  // Helper to map vertical mouse wheel to horizontal scroll for convenience
  const handleWheelHorizontal = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0 || !carouselRef.current) return;
    carouselRef.current.scrollLeft += e.deltaY;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        color: 'white',
        padding: '12px 20px 12px 60px',
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.15)',
        fontSize: '0.8rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'linear-gradient(to right, #000000, #111111)',
        marginBottom: '0px',
        marginTop: '0',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <h3
          style={{
            margin: '4px 0 12px 0',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            color: '#FFA500',
            justifyContent: 'space-between',
            letterSpacing: '0.3px',
            cursor: 'pointer',
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                marginRight: '6px',
                fontSize: '0.8rem',
              }}
            >
              {collapsed ? '▸' : '▾'}
            </span>
            <span
              style={{
                marginRight: '10px',
                fontSize: '0.9rem',
                opacity: 0.9,
              }}
            >
              📋
            </span>
            Goals ({state.notes.length})
          </div>
          <button
            onClick={() => addGoal()}
            style={{
              marginLeft: '10px',
              padding: '0',
              background: 'linear-gradient(45deg, #FFA500, #FF8C00)',
              border: 'none',
              borderRadius: '50%',
              color: '#FFF',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'normal',
              transition: 'all 0.25s ease',
              boxShadow: '0 2px 5px rgba(255, 165, 0, 0.3)',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              transform: 'translateY(-1px)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 3px 7px rgba(255, 165, 0, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(255, 165, 0, 0.3)';
            }}
            aria-label="Add new reminder"
          >
            +
          </button>
        </h3>

        {/* ---------- EXISTING NOTES LIST ---------- */}
        {!collapsed && state.notes.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              gap: '12px',
              margin: '0',
              overflowX: 'auto',
              padding: '0 0 8px 0',
              scrollbarWidth: 'thin',
              scrollbarColor: '#444 #222',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}
          >
            {state.notes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '8px 12px 8px 36px',
                  backgroundColor: note.completed
                    ? 'rgba(245, 245, 220, 0.92)'
                    : 'rgba(255, 250, 230, 0.95)',
                  border: note.completed
                    ? '1px solid rgba(210, 210, 180, 0.6)'
                    : '1px solid rgba(230, 220, 190, 0.6)',
                  borderLeft: `3px solid ${note.completed ? '#BDB76B' : '#FFA500'}`,
                  borderRadius: '5px',
                  fontSize: '0.88rem',
                  minWidth: '240px',
                  maxWidth: '320px',
                  height: 'auto',
                  minHeight: '56px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: note.completed
                    ? '0 1px 3px rgba(0, 0, 0, 0.1)'
                    : '0 2px 6px rgba(0, 0, 0, 0.12)',
                  color: note.completed ? '#555' : '#333',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  opacity: note.completed ? 0.85 : 1,
                  backdropFilter: 'blur(5px)',
                  overflow: 'hidden',
                  fontWeight: '600',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = note.completed
                    ? '0 2px 5px rgba(0, 0, 0, 0.15)'
                    : '0 3px 8px rgba(0, 0, 0, 0.18)';
                  e.currentTarget.style.backgroundColor = note.completed
                    ? 'rgba(245, 245, 220, 0.96)'
                    : 'rgba(255, 250, 230, 0.98)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = note.completed
                    ? '0 1px 3px rgba(0, 0, 0, 0.1)'
                    : '0 2px 6px rgba(0, 0, 0, 0.12)';
                  e.currentTarget.style.backgroundColor = note.completed
                    ? 'rgba(245, 245, 220, 0.92)'
                    : 'rgba(255, 250, 230, 0.95)';
                }}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    deleteGoal(note.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '5px',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    background: 'transparent',
                    color: '#888',
                    border: 'none',
                    fontSize: '18px',
                    fontWeight: 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    lineHeight: 1,
                    opacity: 0.5,
                    zIndex: 10,
                    borderRadius: '3px',
                  }}
                  onMouseOver={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.color = '#ff3333';
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseOut={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.color = '#888';
                    e.currentTarget.style.opacity = '0.5';
                  }}
                  aria-label="Delete reminder"
                >
                  ×
                </button>

                {/* Checkbox - bottom right */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '10px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompleted(note.id);
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: note.completed ? '2px solid #BDB76B' : '2px solid #FFA500',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: note.completed ? '#BDB76B' : 'transparent',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                  >
                    {note.completed && (
                      <span
                        style={{
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transform: 'translateY(-1px)',
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                {/* Time display - modern design */}
                {note.time && !editingId && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '10px',
                      fontSize: '0.8rem',
                      color: '#333',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      background: note.completed
                        ? 'linear-gradient(135deg, #f0efe9, #e9e7de)'
                        : 'linear-gradient(135deg, #fff5e0, #ffe9c0)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering parent click
                      startEditing(note.id, note.text, note.time);
                    }}
                  >
                    <span
                      style={{
                        marginRight: '4px',
                        fontSize: '0.85rem',
                        color: note.completed ? '#9e9b7a' : '#e67e22',
                      }}
                    >
                      ⏰
                    </span>
                    {formatTime(note.time)}
                  </div>
                )}

                {/* Text content */}
                {editingId === note.id ? (
                  <div
                    ref={editContainerRef}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <textarea
                      ref={editInputRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: '60px',
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        padding: '6px 10px',
                        paddingLeft: '22px',
                        paddingRight: '100px',
                        fontSize: '0.88rem',
                        color: '#333',
                        resize: 'none',
                        fontFamily: 'inherit',
                        lineHeight: '1.4',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)',
                        marginBottom: '6px',
                      }}
                      autoFocus
                      placeholder=""
                    />

                    {/* Modern time picker */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: '4px',
                        background: 'white',
                        borderRadius: '8px',
                        padding: '6px 8px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.85rem',
                          color: '#555',
                          marginRight: '8px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          style={{
                            marginRight: '4px',
                            fontSize: '0.9rem',
                            color: '#e67e22',
                          }}
                        >
                          ⏰
                        </span>
                        Time:
                      </label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        style={{
                          fontSize: '0.85rem',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e0e0e0',
                          color: '#333',
                          flex: 1,
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        tabIndex={1} // Add tab index to help with focus
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '2px 4px',
                      paddingLeft: '22px',
                      paddingRight: '100px',
                      paddingBottom: '18px',
                      cursor: 'text',
                      width: '100%',
                      height: '100%',
                      textDecoration: note.completed ? 'line-through' : 'none',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                      color: note.completed ? '#777' : 'inherit',
                      fontWeight: '600',
                    }}
                    onClick={() => {
                      if (editingId !== note.id) {
                        startEditing(note.id, note.text, note.time);
                      }
                    }}
                  >
                    {note.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DailyGoals;
