/**
 * MultiDispositionFilter.tsx
 * A component that implements multi-select functionality for disposition filtering.
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import ReactDOM from 'react-dom';

const FilterContainer = styled.div`
  position: relative;
  min-width: 150px;
  z-index: 9999;
`;

const FilterButton = styled.button`
  min-width: 150px;
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
  top: 100%;
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 9999;
  margin-top: 4px;
  padding: 5px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.15s ease, transform 0.15s ease;

  &.closing {
    opacity: 0;
    transform: translateY(-6px);
  }
`;

const DispositionItem = styled.div<{ $backgroundColor?: string }>`
  padding: 6px 10px;
  cursor: pointer;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 0.875rem;
  color: black;
  display: flex;
  align-items: center;
  background-color: ${(props) => props.$backgroundColor || 'transparent'};
  margin: 2px 5px;
  border-radius: 4px;

  &:hover {
    filter: brightness(1.1);
  }

  &.selected {
    border: 2px solid black;
    font-weight: 600;
  }
`;

const AllItem = styled.div`
  padding: 6px 10px;
  cursor: pointer;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 0.875rem;
  color: white;
  display: flex;
  align-items: center;
  margin: 2px 5px;

  &:hover {
    background-color: rgba(249, 115, 22, 0.2);
  }

  &.selected {
    background-color: rgba(249, 115, 22, 0.4);
    font-weight: 600;
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
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

interface MultiDispositionFilterProps {
  selectedDispositions: string[];
  availableDispositions: string[];
  getColorForDisposition: (disposition: string) => string;
  onChange: (dispositions: string[]) => void;
  className?: string;
}

const MultiDispositionFilter: React.FC<MultiDispositionFilterProps> = ({
  selectedDispositions,
  availableDispositions,
  getColorForDisposition,
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

  const toggleDisposition = (disposition: string) => {
    let newSelectedDispositions: string[];

    if (disposition === '') {
      // When "All Dispositions" is clicked, clear all selections
      newSelectedDispositions = [];
    } else if (selectedDispositions.includes(disposition)) {
      // Remove disposition if already selected
      newSelectedDispositions = selectedDispositions.filter((d) => d !== disposition);
    } else {
      // Add disposition if not already selected
      newSelectedDispositions = [...selectedDispositions, disposition];
    }

    onChange(newSelectedDispositions);
  };

  const getDisplayText = () => {
    if (selectedDispositions.length === 0) {
      return 'All Dispositions';
    } else if (selectedDispositions.length === 1) {
      return selectedDispositions[0];
    } else {
      return `${selectedDispositions.length} Dispositions`;
    }
  };

  return (
    <FilterContainer className={className}>
      <FilterButton
        ref={buttonRef}
        className={selectedDispositions.length > 0 ? 'active' : ''}
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
            <AllItem
              className={selectedDispositions.length === 0 ? 'selected' : ''}
              onClick={() => toggleDisposition('')}
            >
              <Checkbox
                type="checkbox"
                checked={selectedDispositions.length === 0}
                onChange={() => toggleDisposition('')}
              />
              All Dispositions
            </AllItem>

            {availableDispositions.map((disposition) => (
              <DispositionItem
                key={disposition}
                className={selectedDispositions.includes(disposition) ? 'selected' : ''}
                onClick={() => toggleDisposition(disposition)}
                $backgroundColor={getColorForDisposition(disposition)}
              >
                <Checkbox
                  type="checkbox"
                  checked={selectedDispositions.includes(disposition)}
                  onChange={() => toggleDisposition(disposition)}
                />
                {disposition === 'Ghosted' ? 'Ghosted 👻' : disposition}
              </DispositionItem>
            ))}
          </DropdownContainer>,
          document.body
        )}
    </FilterContainer>
  );
};

export default MultiDispositionFilter;
