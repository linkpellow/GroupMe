import React, { memo } from 'react';
import styled from '@emotion/styled';
import useLocalTime from '../hooks/useLocalTime';

// Styled component for the time display
const TimeDisplay = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: #222;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 2;
  user-select: none;
  white-space: nowrap;
  height: 28px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  letter-spacing: 0.01em;

  /* Style for the timezone abbreviation */
  span.timezone {
    font-weight: 800;
    margin-left: 4px;
    color: #0056b3;
  }
`;

interface LocalTimeProps {
  zipCode?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Component that displays the current local time based on a zipcode
 * Uses the useLocalTime hook to get the time and update it every minute
 */
const LocalTime: React.FC<LocalTimeProps> = ({ zipCode, className, style }) => {
  // Use our custom hook to get the local time
  const localTime = useLocalTime(zipCode);

  // Don't render anything if we don't have a time
  if (!localTime) {
    return null;
  }

  return (
    <TimeDisplay className={className} style={style}>
      {localTime}
    </TimeDisplay>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(LocalTime);
