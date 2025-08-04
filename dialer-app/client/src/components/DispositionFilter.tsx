/**
 * DispositionFilter.tsx
 * A simple component that demonstrates how to correctly implement the filter dropdown.
 *
 * To use this in Leads.tsx, replace the custom dropdown with:
 * <DispositionFilter
 *   selectedDispositions={selectedDispositions}
 *   setSelectedDispositions={setSelectedDispositions}
 *   availableDispositions={availableDispositions}
 *   getColorForDisposition={getColorForDisposition}
 * />
 */

import React from 'react';
import styled from '@emotion/styled';

// Use the same FilterDropdown from the main file
const FilterDropdown = styled.select`
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

  &:focus {
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    color: white;
  }

  option {
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    color: white;
    font-family:
      'Inter',
      -apple-system,
      BlinkMacSystemFont,
      sans-serif;
    font-weight: normal;
    font-size: 0.875rem;
    line-height: 1.2;
    min-height: 36px;
    padding: 4px;
  }
`;

interface DispositionFilterProps {
  selectedDispositions: string[];
  setSelectedDispositions: (dispositions: string[]) => void;
  availableDispositions: string[];
  getColorForDisposition: (disposition: string) => string;
}

const DispositionFilter: React.FC<DispositionFilterProps> = ({
  selectedDispositions,
  setSelectedDispositions,
  availableDispositions,
}) => {
  // This function creates a very simple direct selection change
  const handleDispositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('Disposition selected:', value);

    if (value === '') {
      // Clear selection when "All Dispositions" is chosen
      setSelectedDispositions([]);
    } else {
      // Single selection mode - one disposition at a time
      setSelectedDispositions([value]);
    }
  };

  return (
    <FilterDropdown
      value={selectedDispositions.length === 0 ? '' : selectedDispositions[0]}
      onChange={handleDispositionChange}
      className="focus:outline-none focus:ring-2 focus:ring-orange-500"
      style={{
        fontWeight: selectedDispositions.length > 0 ? 600 : 700,
        backgroundColor:
          selectedDispositions.length > 0 ? 'rgba(180, 83, 9, 0.8)' : 'rgba(0, 0, 0, 0.7)',
        color: selectedDispositions.length > 0 ? '#fbbf24' : 'rgba(240, 240, 240, 0.9)',
        borderWidth: selectedDispositions.length > 0 ? '2px' : '1px',
        borderColor: selectedDispositions.length > 0 ? '#f97316' : 'transparent',
        minWidth: '150px',
      }}
    >
      <option value="">All Dispositions</option>
      {availableDispositions.map((disposition) => (
        <option key={disposition} value={disposition}>
          {disposition === 'Ghosted' ? 'Ghosted 👻' : disposition}
        </option>
      ))}
    </FilterDropdown>
  );
};

export default DispositionFilter;
