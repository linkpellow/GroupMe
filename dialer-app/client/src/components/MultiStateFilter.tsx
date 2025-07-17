/**
 * MultiStateFilter.tsx
 * A component that implements multi-select functionality for state filtering.
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import ReactDOM from 'react-dom';

const FilterContainer = styled.div`
  position: relative;
  min-width: 120px;
  z-index: 9999;
`;

const FilterButton = styled.button`
  min-width: 120px;
  width: auto;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  color: white;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.2;
  height: 36px;
  letter-spacing: 0.01em;
  padding: 0 10px;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  border: 1px solid transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #f97316;
  }

  &.active {
    background-color: rgba(180, 83, 9, 0.8);
    color: #fbbf24;
    border-width: 2px;
    border-color: #f97316;
  }
`;

const DropdownContainer = styled.div`
  position: absolute;
  top: 38px;
  left: 0;
  width: 100%;
  max-height: 280px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 9999;
  padding: 4px 0;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.15s ease, transform 0.15s ease;

  &.closing {
    opacity: 0;
    transform: translateY(-6px);
  }
`;

const StateItem = styled.div`
  padding: 4px 8px;
  cursor: pointer;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 0.85rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }

  &.selected {
    background-color: rgba(249, 115, 22, 0.35);
    font-weight: 600;
  }
`;

const Checkbox = styled.input`
  margin-right: 6px;
`;

const ChevronIcon = () => (
  <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1 1L6 5L11 1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface MultiStateFilterProps {
  selectedStates: string[];
  availableStates: string[];
  onChange: (states: string[]) => void;
  className?: string;
}

const MultiStateFilter: React.FC<MultiStateFilterProps> = ({
  selectedStates,
  availableStates,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleState = (state: string) => {
    let newSelectedStates: string[];

    if (state === '') {
      // When "All States" is clicked, clear all selections
      newSelectedStates = [];
    } else if (selectedStates.includes(state)) {
      // Remove state if already selected
      newSelectedStates = selectedStates.filter((s) => s !== state);
    } else {
      // Add state if not already selected
      newSelectedStates = [...selectedStates, state];
    }

    onChange(newSelectedStates);
  };

  const getDisplayText = () => {
    if (selectedStates.length === 0) {
      return 'All States';
    } else if (selectedStates.length === 1) {
      return selectedStates[0];
    } else {
      return `${selectedStates.length} States`;
    }
  };

  return (
    <FilterContainer className={className}>
      <FilterButton
        ref={buttonRef}
        className={selectedStates.length > 0 ? 'active' : ''}
        onClick={() => setIsOpen(!isOpen)}
      >
        {getDisplayText()}
        <ChevronIcon />
      </FilterButton>

      {(isOpen || closing) &&
        ReactDOM.createPortal(
          <DropdownContainer
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              margin: 0,
            }}
            onMouseLeave={() => {
              if (closing) return;
              setClosing(true);
              setTimeout(() => {
                setClosing(false);
                setIsOpen(false);
              }, 150);
            }}
            className={closing ? 'closing' : ''}
          >
            <StateItem
              className={selectedStates.length === 0 ? 'selected' : ''}
              onClick={() => toggleState('')}
            >
              <Checkbox
                type="checkbox"
                checked={selectedStates.length === 0}
                onChange={() => toggleState('')}
              />
              All States
            </StateItem>

            {availableStates.map((state) => (
              <StateItem
                key={state}
                className={selectedStates.includes(state) ? 'selected' : ''}
                onClick={() => toggleState(state)}
              >
                <Checkbox
                  type="checkbox"
                  checked={selectedStates.includes(state)}
                  onChange={() => toggleState(state)}
                />
                {state}
              </StateItem>
            ))}
          </DropdownContainer>,
          document.body
        )}
    </FilterContainer>
  );
};

export default MultiStateFilter;
