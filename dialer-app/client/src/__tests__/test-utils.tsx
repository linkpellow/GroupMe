import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { LeadProvider } from '../context/LeadContext';
import { CallCountsProvider } from '../context/CallCountsContext';
import { FollowUpProvider } from '../context/FollowUpContext';
import { FollowUpUIProvider } from '../context/FollowUpUIContext';

// Create a new QueryClient for each test to ensure isolation
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Turn off retries for tests
    },
  },
});

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CallCountsProvider>
            <LeadProvider>
              <FollowUpProvider>
                <FollowUpUIProvider>
                  {children}
                </FollowUpUIProvider>
              </FollowUpProvider>
            </LeadProvider>
          </CallCountsProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ChakraProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render }; 