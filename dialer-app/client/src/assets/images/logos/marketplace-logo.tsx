import React from 'react';

/**
 * MarketplaceLogo Component
 *
 * A React component that renders the teal triangular marketplace logo
 *
 * @param {object} props - Component props
 * @param {number} props.size - Size of the logo in pixels (default: 72)
 * @param {string} props.className - Additional CSS classes to apply
 * @returns {JSX.Element} The rendered logo
 */
const MarketplaceLogo: React.FC<{
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ size = 72, className = '', style = {} }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        minWidth: size,
        minHeight: size,
        ...style,
      }}
    >
      <rect width="300" height="300" fill="#2C4352" />
      <path d="M150 60L60 240L240 240L150 60Z" fill="#4BE1D0" stroke="#4BE1D0" strokeWidth="2" />
      <path d="M150 60L160 80L140 80L150 60Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M150 80L160 100L140 100L150 80Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M150 100L160 120L140 120L150 100Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M150 120L160 140L140 140L150 120Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M150 140L160 160L140 160L150 140Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M150 160L160 180L140 180L150 160Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M150 180L160 200L140 200L150 180Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M150 200L160 220L140 220L150 200Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M100 240L105 230L95 230L100 240Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M120 240L125 230L115 230L120 240Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M140 240L145 230L135 230L140 240Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M160 240L165 230L155 230L160 240Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M180 240L185 230L175 230L180 240Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
      <path d="M200 240L205 230L195 230L200 240Z" fill="#2C4352" stroke="#2C4352" strokeWidth="1" />
    </svg>
  );
};

export default MarketplaceLogo;
