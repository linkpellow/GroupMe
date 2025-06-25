import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Text, Button } from '@chakra-ui/react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GroupMeChatErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return {
      hasError: true,
      error: error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('GroupMeChat Error Boundary caught an error:', error);
    console.error('Error info:', errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Box p={4} bg="gray.800" color="white" borderRadius="md" textAlign="center">
          <Text mb={4}>Something went wrong loading the GroupMe component.</Text>
          <Button colorScheme="blue" onClick={this.resetErrorBoundary}>
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default GroupMeChatErrorBoundary;
