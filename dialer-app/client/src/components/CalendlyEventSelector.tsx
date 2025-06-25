import React from 'react';
import styled from '@emotion/styled';
import { CALENDLY_EVENT_TYPES, CalendlyEventType } from '../utils/calendlyConstants';

// Add Calendly font styles at the top
const calendlyFontStyles = `
  @font-face {
    font-family: 'Gilroy';
    src: url('https://assets.calendly.com/assets/frontend/media/fonts/gilroy-medium-f5b19951.woff2') format('woff2');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
  }
  
  @font-face {
    font-family: 'Gilroy';
    src: url('https://assets.calendly.com/assets/frontend/media/fonts/gilroy-semibold-d41d259d.woff2') format('woff2');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }
  
  @font-face {
    font-family: 'Gilroy';
    src: url('https://assets.calendly.com/assets/frontend/media/fonts/gilroy-bold-11f8faa8.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
`;

const EventSelectorContainer = styled.div`
  ${calendlyFontStyles}
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family:
    'Gilroy',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  color: #1a1a1a;
`;

const EventTypeTitle = styled.h2`
  font-family:
    'Gilroy',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
  text-align: center;
  letter-spacing: -0.01em;
`;

const EventTypeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EventTypeButton = styled.button<{ selected?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 18px;
  border-radius: 6px;
  border: 2px solid ${(props) => (props.selected ? '#0069ff' : '#e2e2e2')};
  background-color: ${(props) => (props.selected ? '#ebf4ff' : '#ffffff')};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family:
    'Gilroy',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;

  &:hover {
    background-color: ${(props) => (props.selected ? '#ebf4ff' : '#f9f9f9')};
    border-color: ${(props) => (props.selected ? '#0069ff' : '#0069ff')};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 105, 255, 0.3);
  }
`;

const EventTypeName = styled.div`
  font-family:
    'Gilroy',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 6px;
  letter-spacing: -0.01em;
`;

const EventTypeDescription = styled.div`
  font-family:
    'Gilroy',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  margin-top: 4px;
  letter-spacing: 0;
`;

interface CalendlyEventSelectorProps {
  onSelectEvent: (eventType: CalendlyEventType) => void;
  selectedEventId?: string;
}

const CalendlyEventSelector: React.FC<CalendlyEventSelectorProps> = ({
  onSelectEvent,
  selectedEventId = 'discoverycall', // Default to discovery call
}) => {
  return (
    <EventSelectorContainer>
      <EventTypeTitle>Select Appointment Type</EventTypeTitle>
      <EventTypeList>
        {CALENDLY_EVENT_TYPES.map((eventType: CalendlyEventType) => (
          <EventTypeButton
            key={eventType.id}
            selected={selectedEventId === eventType.id}
            onClick={() => onSelectEvent(eventType)}
          >
            <EventTypeName>{eventType.name}</EventTypeName>
            <EventTypeDescription>{eventType.description}</EventTypeDescription>
          </EventTypeButton>
        ))}
      </EventTypeList>
    </EventSelectorContainer>
  );
};

export default CalendlyEventSelector;
