import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { DateRangePicker } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { ChevronDownIcon } from '@chakra-ui/icons';

const FilterContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const FilterButton = styled.button`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: #2d3748;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: space-between;
  
  &:hover {
    border-color: #cbd5e0;
    background: #f7fafc;
  }
  
  &:focus {
    outline: none;
    border-color: #3182ce;
    box-shadow: 0 0 0 1px #3182ce;
  }
`;

const ChevronIcon = styled(ChevronDownIcon)<{ isOpen: boolean }>`
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
`;

const DropdownPortal = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  margin-top: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: ${props => props.isOpen ? 'block' : 'none'};
  min-width: 300px;
`;

const DateRangeContainer = styled.div`
  padding: 16px;
  
  .rdrCalendarWrapper {
    font-size: 13px;
  }
  
  .rdrDefinedRangesWrapper {
    display: none; // Hide predefined ranges for cleaner look
  }
  
  .rdrDateDisplayWrapper {
    background: #f7fafc;
    border-radius: 6px;
    margin-bottom: 12px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  gap: 8px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid;
  
  ${props => props.variant === 'primary' ? `
    background: #3182ce;
    color: white;
    border-color: #3182ce;
    
    &:hover {
      background: #2c5aa0;
    }
  ` : `
    background: white;
    color: #4a5568;
    border-color: #e2e8f0;
    
    &:hover {
      background: #f7fafc;
    }
  `}
`;

interface DateRangeFilterProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onChange: (startDate: Date | null, endDate: Date | null) => void;
  className?: string;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localRange, setLocalRange] = useState([{
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    key: 'selection'
  }]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Format display text
  const getDisplayText = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
    } else if (startDate) {
      return `From ${format(startDate, 'MMM d')}`;
    } else if (endDate) {
      return `Until ${format(endDate, 'MMM d')}`;
    }
    return 'Created At';
  };

  const handleRangeChange = (ranges: any) => {
    const { selection } = ranges;
    setLocalRange([selection]);
  };

  const handleApply = () => {
    const range = localRange[0];
    onChange(range.startDate || null, range.endDate || null);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalRange([{ startDate: undefined, endDate: undefined, key: 'selection' }]);
    onChange(null, null);
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to current values
    setLocalRange([{
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      key: 'selection'
    }]);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        const dropdown = document.querySelector('[data-date-range-dropdown]');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <FilterContainer className={className}>
      <FilterButton
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
      >
        {getDisplayText()}
        <ChevronIcon isOpen={isOpen} />
      </FilterButton>
      
      <DropdownPortal isOpen={isOpen} data-date-range-dropdown>
        <DateRangeContainer>
          <DateRangePicker
            ranges={localRange}
            onChange={handleRangeChange}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="horizontal"
          />
        </DateRangeContainer>
        
        <ActionButtons>
          <Button onClick={handleClear}>
            Clear
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </ActionButtons>
      </DropdownPortal>
    </FilterContainer>
  );
};

export default DateRangeFilter; 