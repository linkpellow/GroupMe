import React from 'react';

interface StateIconProps {
  state: string;
  className?: string;
}

const StateIcon: React.FC<StateIconProps> = ({ state, className = '' }) => {
  if (!state) return <span>-</span>;

  const stateAbbr = state.toUpperCase();

  return (
    <img
      src={`/states/${stateAbbr}.png`}
      alt={`${stateAbbr} state icon`}
      className={`w-9 h-9 object-contain ${className}`}
      style={{
        maxWidth: '36px',
        maxHeight: '36px',
        display: 'block',
        margin: '0 auto',
      }}
      onError={(e) => {
        // If image fails to load, show the state abbreviation as fallback
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        target.parentElement!.textContent = stateAbbr;
      }}
    />
  );
};

export default StateIcon;
