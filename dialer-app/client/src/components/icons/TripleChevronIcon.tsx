import React from 'react';
import { Icon, IconProps } from '@chakra-ui/react';

interface Props extends IconProps {
  direction?: 'left' | 'right';
}

const TripleChevronIcon: React.FC<Props> = ({ direction = 'right', ...props }) => {
  const isRight = direction === 'right';
  // three small chevrons stacked vertically
  const d = isRight
    ? 'M2 4 L6 8 L2 12 M6 4 L10 8 L6 12 M10 4 L14 8 L10 12'
    : 'M14 4 L10 8 L14 12 M10 4 L6 8 L10 12 M6 4 L2 8 L6 12';
  return (
    <Icon viewBox="0 0 16 16" sx={{ filter: 'drop-shadow(0 0 6px rgba(255,140,0,0.85))' }} {...props}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
};

export default TripleChevronIcon; 