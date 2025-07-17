import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import './Spreadsheet.css';
import StateIcon from '../components/StateIcon';
import { useLeads } from '../context/LeadContext';

interface Cell {
  value: string;
  isEditing: boolean;
  backgroundColor?: string;
}

interface ContextMenu {
  show: boolean;
  x: number;
  y: number;
  rowIndex: number;
  colIndex: number;
}

interface RowData {
  status: string;
  name: string;
  email: string;
  state: string;
  zipcode: string;
  dob: string;
  leadType: string;
  number: string;
  apptDate: string;
  notes: string;
  color: string;
}

interface HistoryAction {
  type:
    | 'CUT'
    | 'PASTE'
    | 'CLEAR_ROW'
    | 'DELETE_ROW'
    | 'INSERT_ROW_ABOVE'
    | 'INSERT_ROW_BELOW'
    | 'EDIT_CELL';
  cells: Cell[][];
  rowIndex?: number;
  colIndex?: number;
  previousValue?: string;
  previousColor?: string;
  timestamp: number;
}

// Create a global type for the window object
declare global {
  interface Window {
    addToSpreadsheet: (data: RowData) => void;
  }
}

export default function Spreadsheet() {
  // Initialize cells from localStorage or create new if not exists
  const [cells, setCells] = useState<Cell[][]>(() => {
    const savedCells = localStorage.getItem('spreadsheetCells');
    return savedCells
      ? JSON.parse(savedCells)
      : Array(100)
          .fill(null)
          .map(() =>
            Array(10)
              .fill(null)
              .map(() => ({
                value: '',
                isEditing: false,
                backgroundColor: '#ffffff',
              }))
          );
  });

  // Initialize nextRow from localStorage or start at 0
  const [nextRow] = useState<number>(() => {
    const savedNextRow = localStorage.getItem('spreadsheetNextRow');
    return savedNextRow ? parseInt(savedNextRow, 10) : 0;
  });

  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    show: false,
    x: 0,
    y: 0,
    rowIndex: -1,
    colIndex: -1,
  });
  const [clipboard, setClipboard] = useState<{
    value: string;
    backgroundColor?: string;
  } | null>(null);
  const [history, setHistory] = useState<HistoryAction[]>([]);

  const availableDispositions = [
    'Positive Contact',
    'Negative Contact',
    'Employer Coverage',
    'Brokie',
    'Buy Or Die',
    'Unhealthy/Referred',
    'Foreign',
    'Quoted',
    'SOLD',
    'Appointment',
  ];

  const { getColorForDisposition: contextGetColor } = useLeads();

  // Replace the static function with the context version
  const getDispositionColor = (disposition: string) => {
    return contextGetColor(disposition);
  };

  // Save cells to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('spreadsheetCells', JSON.stringify(cells));
  }, [cells]);

  // Save nextRow to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('spreadsheetNextRow', nextRow.toString());
  }, [nextRow]);

  const addLeadToSpreadsheet = useCallback((data: RowData) => {
    if (!data) {
      console.error('No data provided to addLeadToSpreadsheet');
      return;
    }

    // Use a ref to track if we're currently processing
    let isProcessing = false;

    setCells((prev) => {
      if (isProcessing) return prev;
      isProcessing = true;

      // Find the first empty row (where all cells in the row are empty)
      const firstEmptyRowIndex = prev.findIndex((row) => row.every((cell) => !cell.value.trim()));

      if (firstEmptyRowIndex === -1) {
        toast.error('Spreadsheet is full!');
        return prev;
      }

      const newCells = [...prev];
      const row = [
        {
          value: data.status || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.name || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.email || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.state || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.zipcode || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.dob || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.leadType || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.number || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.apptDate || '',
          isEditing: false,
          backgroundColor: data.color,
        },
        {
          value: data.notes || '',
          isEditing: false,
          backgroundColor: data.color,
        },
      ];

      newCells[firstEmptyRowIndex] = row;
      isProcessing = false;
      return newCells;
    });

    toast.success('Lead added to spreadsheet!');
  }, []);

  // Check for pending lead data on mount and when addLeadToSpreadsheet changes
  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingLeadData');
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData);
        addLeadToSpreadsheet(data);
        // Only remove the data after successful processing
        sessionStorage.removeItem('pendingLeadData');
      } catch (error) {
        console.error('Error processing pending data:', error);
        toast.error('Failed to add lead to spreadsheet');
        // Clean up invalid data
        sessionStorage.removeItem('pendingLeadData');
      }
    }
  }, [addLeadToSpreadsheet]);

  // Expose the addLeadToSpreadsheet function globally when component mounts
  useEffect(() => {
    window.addToSpreadsheet = addLeadToSpreadsheet;
    return () => {
      window.addToSpreadsheet = () => {
        console.warn('Spreadsheet component is unmounted');
      };
    };
  }, [addLeadToSpreadsheet]);

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    // For Status column (colIndex === 0), we don't want to set isEditing
    // For all other columns, we do want to set isEditing
    setCells((prev) =>
      prev.map((row, r) =>
        row.map((cell, c) => ({
          ...cell,
          isEditing: r === rowIndex && c === colIndex && c !== 0,
        }))
      )
    );
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    // Save current state to history before making the change
    addToHistory({
      type: 'EDIT_CELL',
      cells: JSON.parse(JSON.stringify(cells)),
      rowIndex,
      colIndex,
      previousValue: cells[rowIndex][colIndex].value,
    });

    setCells((prev) =>
      prev.map((row, r) =>
        row.map((cell, c) => (r === rowIndex && c === colIndex ? { ...cell, value } : cell))
      )
    );
  };

  const handleBlur = () => {
    setCells((prev) =>
      prev.map((row) =>
        row.map((cell, _colIndex) => ({
          ...cell,
          isEditing: false,
        }))
      )
    );
  };

  // Hide context menu when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu((prev) => ({ ...prev, show: false }));
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      rowIndex,
      colIndex,
    });
  };

  const handleCut = () => {
    const cell = cells[contextMenu.rowIndex][contextMenu.colIndex];
    setClipboard({ value: cell.value, backgroundColor: cell.backgroundColor });

    // Save current state to history
    addToHistory({
      type: 'CUT',
      cells: JSON.parse(JSON.stringify(cells)),
      rowIndex: contextMenu.rowIndex,
      colIndex: contextMenu.colIndex,
      previousValue: cell.value,
      previousColor: cell.backgroundColor,
    });

    setCells((prev) =>
      prev.map((row, r) =>
        row.map((c, col) =>
          r === contextMenu.rowIndex && col === contextMenu.colIndex
            ? { ...c, value: '', backgroundColor: '#ffffff' }
            : c
        )
      )
    );
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  const handleCopy = () => {
    const cell = cells[contextMenu.rowIndex][contextMenu.colIndex];
    setClipboard({ value: cell.value, backgroundColor: cell.backgroundColor });
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  const handlePaste = () => {
    if (!clipboard) return;

    // Save current state to history
    addToHistory({
      type: 'PASTE',
      cells: JSON.parse(JSON.stringify(cells)),
      rowIndex: contextMenu.rowIndex,
      colIndex: contextMenu.colIndex,
    });

    setCells((prev) =>
      prev.map((row, r) =>
        row.map((c, col) =>
          r === contextMenu.rowIndex && col === contextMenu.colIndex
            ? {
                ...c,
                value: clipboard.value,
                backgroundColor: clipboard.backgroundColor,
              }
            : c
        )
      )
    );
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  const handleInsertRowAbove = () => {
    if (cells.length >= 100) {
      toast.error('Maximum rows reached');
      return;
    }

    // Save current state to history
    addToHistory({
      type: 'INSERT_ROW_ABOVE',
      cells: JSON.parse(JSON.stringify(cells)),
      rowIndex: contextMenu.rowIndex,
    });

    setCells((prev) =>
      [
        ...prev.slice(0, contextMenu.rowIndex),
        Array(10)
          .fill(null)
          .map(() => ({
            value: '',
            isEditing: false,
            backgroundColor: '#ffffff',
          })),
        ...prev.slice(contextMenu.rowIndex),
      ].slice(0, 100)
    );
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  const handleInsertRowBelow = () => {
    if (cells.length >= 100) {
      toast.error('Maximum rows reached');
      return;
    }

    // Save current state to history
    addToHistory({
      type: 'INSERT_ROW_BELOW',
      cells: JSON.parse(JSON.stringify(cells)),
      rowIndex: contextMenu.rowIndex,
    });

    setCells((prev) =>
      [
        ...prev.slice(0, contextMenu.rowIndex + 1),
        Array(10)
          .fill(null)
          .map(() => ({
            value: '',
            isEditing: false,
            backgroundColor: '#ffffff',
          })),
        ...prev.slice(contextMenu.rowIndex + 1),
      ].slice(0, 100)
    );
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  const handleDeleteRow = () => {
    // Save current state to history
    addToHistory({
      type: 'DELETE_ROW',
      cells: JSON.parse(JSON.stringify(cells)),
      rowIndex: contextMenu.rowIndex,
    });

    setCells((prev) => [
      ...prev.slice(0, contextMenu.rowIndex),
      ...prev.slice(contextMenu.rowIndex + 1),
      Array(10)
        .fill(null)
        .map(() => ({
          value: '',
          isEditing: false,
          backgroundColor: '#ffffff',
        })),
    ]);
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  const handleClearRow = () => {
    // Save current state to history
    addToHistory({
      type: 'CLEAR_ROW',
      cells: JSON.parse(JSON.stringify(cells)),
      rowIndex: contextMenu.rowIndex,
    });

    setCells((prev) =>
      prev.map((row, r) =>
        r === contextMenu.rowIndex
          ? row.map((cell) => ({
              ...cell,
              value: '',
              backgroundColor: '#ffffff',
            }))
          : row
      )
    );
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  // Add new function to handle disposition changes
  const handleDispositionChange = (rowIndex: number, value: string) => {
    // Save current state to history before making the change
    addToHistory({
      type: 'EDIT_CELL',
      cells: JSON.parse(JSON.stringify(cells)),
      rowIndex,
      colIndex: 0,
      previousValue: cells[rowIndex][0].value,
    });

    const backgroundColor = getDispositionColor(value);

    setCells((prev) =>
      prev.map((row, r) =>
        r === rowIndex
          ? row.map((cell, c) => ({
              ...cell,
              backgroundColor,
              ...(c === 0 ? { value } : {}),
            }))
          : row
      )
    );
  };

  const headers = [
    '#',
    'Status',
    'NAME',
    'Email',
    'STATE',
    'ZIPCODE',
    'DOB',
    'LEAD TYPE',
    'NUMBER',
    'APPT/FU DATE',
    'NOTES:',
  ];

  // Clean up old history items
  useEffect(() => {
    const cleanup = () => {
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      setHistory((prev) => prev.filter((action) => action.timestamp > twentyFourHoursAgo));
    };

    // Run cleanup every hour
    const interval = setInterval(cleanup, 60 * 60 * 1000);

    // Run cleanup on component mount
    cleanup();

    return () => clearInterval(interval);
  }, []);

  // Add action to history with timestamp
  const addToHistory = (action: Omit<HistoryAction, 'timestamp'>) => {
    setHistory((prev) => [...prev, { ...action, timestamp: Date.now() }]);
  };

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('spreadsheetHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history to localStorage:', error);
    }
  }, [history]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('spreadsheetHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Clean up old items on load
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        setHistory(parsed.filter((action: HistoryAction) => action.timestamp > twentyFourHoursAgo));
      }
    } catch (error) {
      console.error('Failed to load history from localStorage:', error);
    }
  }, []);

  // Handle undo with Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (history.length > 0) {
          const lastAction = history[history.length - 1];
          setCells(lastAction.cells);
          setHistory((prev) => prev.slice(0, -1));
          toast.success('Undo successful');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [history]);

  // If cells is null or undefined, show loading
  if (!cells) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        backgroundColor: '#ffffff',
        overflow: 'auto',
        padding: '20px',
      }}
    >
      <div style={{ marginBottom: '20px', fontSize: '16px' }}>
        Leads ({cells.filter((row) => row.some((cell) => cell.value.trim() !== '')).length} total)
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff',
            tableLayout: 'fixed',
            border: '1px solid black',
          }}
        >
          <thead>
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  style={{
                    border: '1px solid black',
                    borderBottom: '2px solid black',
                    borderRight: i === 0 ? '3px solid black' : '1px solid black',
                    padding: '8px',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    textAlign: i === 0 ? 'center' : 'left',
                    width: i === 0 ? '50px' : 'auto',
                    position: i === 0 ? 'sticky' : 'relative',
                    left: i === 0 ? 0 : 'auto',
                    zIndex: 2,
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td
                  style={{
                    border: '1px solid black',
                    borderRight: '3px solid black',
                    padding: '6px 8px',
                    backgroundColor: '#f8f9fa',
                    height: '21px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    width: '50px',
                  }}
                >
                  {rowIndex + 1}
                </td>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                    style={{
                      border: '1px solid black',
                      padding: '6px 8px',
                      backgroundColor: cell.backgroundColor || '#ffffff',
                      height: '21px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      position: 'relative',
                    }}
                  >
                    {colIndex === 0 ? (
                      <select
                        value={cell.value}
                        onChange={(e) => handleDispositionChange(rowIndex, e.target.value)}
                        style={{
                          width: '100%',
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '13px',
                          height: '100%',
                          cursor: 'pointer',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          appearance: 'none',
                          paddingRight: '20px',
                        }}
                      >
                        <option value=""></option>
                        {availableDispositions.map((disposition) => (
                          <option
                            key={disposition}
                            value={disposition}
                            style={{
                              backgroundColor: getDispositionColor(disposition),
                            }}
                          >
                            {disposition}
                          </option>
                        ))}
                      </select>
                    ) : cell.isEditing ? (
                      <input
                        autoFocus
                        value={cell.value}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        onBlur={handleBlur}
                        style={{
                          width: '100%',
                          border: 'none',
                          padding: '0',
                          backgroundColor: 'transparent',
                          fontSize: '13px',
                          height: '100%',
                        }}
                      />
                    ) : (
                      <span>{colIndex === 3 ? <StateIcon state={cell.value} /> : cell.value}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {contextMenu.show && (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
              zIndex: 1000,
              borderRadius: '4px',
            }}
          >
            <div className="context-menu">
              <button onClick={handleCut} className="menu-item">
                Cut
              </button>
              <button onClick={handleCopy} className="menu-item">
                Copy
              </button>
              <button onClick={handlePaste} className="menu-item">
                Paste
              </button>
              <button onClick={handlePaste} className="menu-item">
                Paste special
              </button>
              <div className="menu-separator" />
              <button onClick={handleInsertRowAbove} className="menu-item">
                Insert 1 row above
              </button>
              <button onClick={handleInsertRowBelow} className="menu-item">
                Insert 1 row below
              </button>
              <button onClick={handleDeleteRow} className="menu-item">
                Delete row
              </button>
              <button onClick={handleClearRow} className="menu-item">
                Clear row
              </button>
              <button
                onClick={() => setContextMenu((prev) => ({ ...prev, show: false }))}
                className="menu-item"
              >
                Hide row
              </button>
              <button
                onClick={() => setContextMenu((prev) => ({ ...prev, show: false }))}
                className="menu-item"
              >
                Resize row
              </button>
              <div className="menu-separator" />
              <button
                onClick={() => setContextMenu((prev) => ({ ...prev, show: false }))}
                className="menu-item"
              >
                Remove filter
              </button>
              <button
                onClick={() => setContextMenu((prev) => ({ ...prev, show: false }))}
                className="menu-item"
              >
                Conditional formatting
              </button>
              <button
                onClick={() => setContextMenu((prev) => ({ ...prev, show: false }))}
                className="menu-item"
              >
                Data validation
              </button>
              <button
                onClick={() => setContextMenu((prev) => ({ ...prev, show: false }))}
                className="menu-item"
              >
                View more row actions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
