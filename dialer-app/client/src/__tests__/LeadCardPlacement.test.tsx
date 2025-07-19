/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen } from './test-utils'; // Use our custom render
import '@testing-library/jest-dom'; // For toBeInTheDocument and toHaveStyle matchers
import Leads from '../pages/Leads';

// smoke test ensuring Leads component renders without crashing

test('Leads component renders without crashing', () => {
  const { container } = render(<Leads />);
  
  // Check that the component rendered something
  expect(container).toBeInTheDocument();
  
  // Could also check for specific elements that should always be present
  // For example, the search input or filters
  // const searchInput = screen.getByPlaceholderText(/search/i);
  // expect(searchInput).toBeInTheDocument();
}); 