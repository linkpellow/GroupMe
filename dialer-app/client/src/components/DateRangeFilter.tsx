import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { DateRangePicker } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const FilterContainer = styled.div`
  position: relative;
  display: inline-block;
`;

// Match existing FilterButton styling exactly
const FilterButton = styled.button`
  width: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  color: white;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
    border-color: #EFBF04;
  }
  
  &.active {
    background-color: rgba(239, 191, 4, 0.25);
    color: #000;
    border-width: 2px;
    border-color: #EFBF04;
  }
`;

// Custom chevron to match existing design
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

// Match existing DropdownContainer styling exactly with critical z-index fix
const DropdownContainer = styled.div`
  position: fixed;
  min-width: 350px;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10000; /* Critical fix - above all lead cards */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.15s ease, transform 0.15s ease;
  color: white;

  &.closing {
    opacity: 0;
    transform: translateY(-6px);
  }

  /* Override react-date-range styles for dark theme */
  .rdrCalendarWrapper {
    background: transparent !important;
    color: white !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
  }

  .rdrMonth {
    background: transparent !important;
  }

  .rdrMonthAndYearWrapper {
    background: transparent !important;
    color: white !important;
  }

  .rdrMonthAndYearPickers select {
    background: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 4px !important;
  }

  .rdrWeekDays {
    background: transparent !important;
  }

  .rdrWeekDay {
    color: rgba(255, 255, 255, 0.7) !important;
    font-weight: 600 !important;
  }

  .rdrDays {
    background: transparent !important;
  }

  .rdrDay {
    background: transparent !important;
  }

  .rdrDayNumber {
    color: white !important;
    font-weight: 500 !important;
  }

  .rdrDayNumber span {
    color: white !important;
  }

  .rdrDayToday .rdrDayNumber span:after {
    background: #EFBF04 !important;
  }

  .rdrDayActive .rdrDayNumber span,
  .rdrDayInRange .rdrDayNumber span {
    background: #EFBF04 !important;
    color: #000 !important;
    font-weight: 600 !important;
  }

  .rdrDayStartOfRange .rdrDayNumber span,
  .rdrDayEndOfRange .rdrDayNumber span {
    background: #EFBF04 !important;
    color: #000 !important;
    font-weight: 600 !important;
  }

  .rdrDayStartOfMonth .rdrDayNumber span,
  .rdrDayEndOfMonth .rdrDayNumber span {
    color: rgba(255, 255, 255, 0.4) !important;
  }

  .rdrDayDisabled .rdrDayNumber span {
    color: rgba(255, 255, 255, 0.3) !important;
  }

  .rdrDayPassive .rdrDayNumber span {
    color: rgba(255, 255, 255, 0.4) !important;
  }

  .rdrInRange {
    background: rgba(239, 191, 4, 0.2) !important;
  }

  .rdrStartEdge {
    background: rgba(239, 191, 4, 0.3) !important;
  }

  .rdrEndEdge {
    background: rgba(239, 191, 4, 0.3) !important;
  }

  .rdrSelected {
    background: rgba(239, 191, 4, 0.4) !important;
  }

  .rdrDayHover .rdrDayNumber span {
    background: rgba(239, 191, 4, 0.6) !important;
    color: #000 !important;
  }

  /* Fix arrow directions - flip right arrow horizontally */
  .rdrNextPrevButton {
    background: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    
    &:hover {
      background: rgba(239, 191, 4, 0.8) !important;
      color: #000 !important;
    }
  }

  .rdrNextButton {
    transform: scaleX(-1); /* Flip right arrow horizontally */
  }

  .rdrPprevButton i,
  .rdrNextButton i {
    border-color: transparent white transparent transparent !important;
  }

  .rdrPrevButton i {
    border-color: transparent transparent transparent white !important;
  }

  .rdrDateDisplayWrapper {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 4px !important;
    color: white !important;
  }

  .rdrDateDisplayItem {
    background: transparent !important;
    color: white !important;
    border: none !important;
  }

  .rdrDateDisplayItemActive {
    border: 1px solid #EFBF04 !important;
    background: rgba(239, 191, 4, 0.1) !important;
  }

  .rdrMonthName {
    color: white !important;
    font-weight: 600 !important;
  }

  .rdrYearPicker select,
  .rdrMonthPicker select {
    background: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
  }
`;

const DateRangeContainer = styled.div`
  padding: 16px;
  
  .rdrDefinedRangesWrapper {
    display: none; /* Hide predefined ranges for cleaner look */
  }
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  gap: 8px;
`;

// Match existing button styling with Inter font
const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: #EFBF04;
    color: #000;
    border-color: #EFBF04;
    
    &:hover {
      background: #d4a503;
      border-color: #d4a503;
    }
  ` : `
    background: transparent;
    color: white;
    border-color: rgba(255, 255, 255, 0.3);
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
    }
  `}
`;

interface DateRangeFilterProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onChange: (startDate: Date | null, endDate: Date | null) => void;
  className?: string;
}

// Helper function to get current year maximum date
const getCurrentYearMaxDate = () => {
  const currentYear = new Date().getFullYear();
  return new Date(currentYear, 11, 31); // December 31st of current year
};

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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [closing, setClosing] = useState(false);
  const [hoverCloseTimer, setHoverCloseTimer] = useState<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update local range when props change
  useEffect(() => {
    setLocalRange([{
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      key: 'selection'
    }]);
  }, [startDate, endDate]);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverCloseTimer) {
        clearTimeout(hoverCloseTimer);
      }
    };
  }, [hoverCloseTimer]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (buttonRef.current && !buttonRef.current.contains(target)) {
        const dropdownContainers = document.querySelectorAll('[data-date-range-dropdown]');
        const clickedInDropdown = Array.from(dropdownContainers).some((container) =>
          container.contains(target)
        );

        if (!clickedInDropdown && isOpen) {
          handleClose();
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  // Graceful close on hover-off with delay
  const handleMouseLeave = () => {
    const timer = setTimeout(() => {
      handleClose();
    }, 250); // 250ms delay for graceful UX
    setHoverCloseTimer(timer);
  };

  // Cancel close on mouse re-enter
  const handleMouseEnter = () => {
    if (hoverCloseTimer) {
      clearTimeout(hoverCloseTimer);
      setHoverCloseTimer(null);
    }
  };

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
    handleClose();
  };

  const handleCancel = () => {
    // Reset to current props
    setLocalRange([{
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      key: 'selection'
    }]);
    handleClose();
  };

  const handleClear = () => {
    setLocalRange([{
      startDate: undefined,
      endDate: undefined,
      key: 'selection'
    }]);
    onChange(null, null);
    handleClose();
  };

  const handleClose = () => {
    if (closing) return;
    
    // Clear any pending hover close timer
    if (hoverCloseTimer) {
      clearTimeout(hoverCloseTimer);
      setHoverCloseTimer(null);
    }
    
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setIsOpen(false);
    }, 150);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  const hasActiveFilter = startDate || endDate;

  return (
    <FilterContainer className={className}>
      <FilterButton
        ref={buttonRef}
        onClick={handleToggle}
        className={hasActiveFilter ? 'active' : ''}
      >
        {getDisplayText()} <ChevronIcon />
      </FilterButton>
      
      {(isOpen || closing) && (
        <DropdownContainer
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          className={closing ? 'closing' : ''}
          data-date-range-dropdown
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        >
          <DateRangeContainer>
            <DateRangePicker
              ranges={localRange}
              onChange={handleRangeChange}
              moveRangeOnFirstSelection={false}
              retainEndDateOnFirstSelection={false}
              months={1}
              direction="horizontal"
              preventSnapRefocus={true}
              calendarFocus="backwards"
              showDateDisplay={false}
              maxDate={getCurrentYearMaxDate()}
            />
          </DateRangeContainer>
          <ActionButtons>
            <div>
              <Button variant="secondary" onClick={handleClear}>
                Clear
              </Button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </ActionButtons>
        </DropdownContainer>
      )}
    </FilterContainer>
  );
};

export default DateRangeFilter; 