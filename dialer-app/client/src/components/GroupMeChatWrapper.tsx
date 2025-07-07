import React, { useState, useEffect } from 'react';
import { Box, Spinner, Text, Button, useToast } from '@chakra-ui/react';
import GroupMeChatErrorBoundary from './GroupMeChatErrorBoundary';
import { useGroupMeConfig } from '../context/GroupMeContext';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';
import { useAuth } from '../context/AuthContext';

// Split the interface to clearly define prop types
interface GroupMeChatProps {
  setActiveTab: (tab: 'chat' | 'settings') => void;
  inSidebar?: boolean;
}

/**
 * This is a wrapper component that handles initialization and loading states
 * before rendering the actual GroupMeChat component.
 *
 * It ensures that all required context values are loaded before rendering the chat
 * to prevent hooks from being called conditionally.
 */
const GroupMeChatWrapper: React.FC<GroupMeChatProps> = (props) => {
  const { loading, config, refreshGroups } = useGroupMeConfig();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();
  const toast = useToast();

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await groupMeOAuthService.checkConnectionStatus();
        setIsConnected(status.connected);
      } catch (error) {
        console.error('Error checking GroupMe connection status:', error);
      }
    };
    
    checkConnection();
  }, []);

  // Auto-fetch groups when component mounts if connected
  useEffect(() => {
    if (isConnected && config?.accessToken && refreshGroups) {
      console.log('GroupMeChatWrapper: Auto-fetching groups on mount');
      setIsInitialized(false); // Reset initialization while fetching
      refreshGroups()
        .then(() => {
          console.log('GroupMeChatWrapper: Groups fetched successfully');
          // Set a small delay to ensure context is updated
          setTimeout(() => {
            setIsInitialized(true);
          }, 500);
        })
        .catch(err => {
          console.error('Error auto-fetching groups:', err);
          setIsInitialized(true); // Still mark as initialized even on error
        });
    } else {
      console.log('GroupMeChatWrapper: Not auto-fetching groups because:',
        isConnected ? 'connected' : 'not connected',
        config?.accessToken ? 'has token' : 'no token',
        refreshGroups ? 'has refreshGroups' : 'no refreshGroups'
      );
    }
  }, [isConnected, config, refreshGroups]);

  // Ensure the component is only rendered after initial setup is complete
  useEffect(() => {
    if (!loading) {
      /* production: removed debug logs */
      // Set a small delay to ensure all context values are fully propagated
      const timer = setTimeout(() => {
        /* production: removed debug logs */
        setIsInitialized(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleConnectGroupMe = async () => {
    if (!user?.id) {
      console.error('No user ID found, cannot connect GroupMe');
      toast({
        title: 'Login required',
        description: 'Please log in before connecting GroupMe.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    console.log('=== Starting GroupMe OAuth Flow from Wrapper ===');
    console.log('Current user ID:', user.id);
    
    // Store current auth token in sessionStorage before starting OAuth flow
    try {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        sessionStorage.setItem('groupme_auth_token_backup', currentToken);
        console.log('Saved current auth token to sessionStorage as backup');
      }
    } catch (storageError) {
      console.warn('Could not save token to sessionStorage:', storageError);
      // Continue anyway - this is just a precaution
    }
    
    setIsConnecting(true);
    
    try {
      console.log('Initiating GroupMe OAuth...');
      
      let authUrl;
      try {
        const response = await groupMeOAuthService.initiateOAuth(user.id);
        console.log('OAuth response received:', response);
        authUrl = response.authUrl;
        
        if (!authUrl || !authUrl.includes('oauth.groupme.com')) {
          throw new Error('Invalid authorization URL received from server');
        }
      } catch (initError: any) {
        console.error('OAuth initiation failed:', initError);
        console.error('Error details:', {
          status: initError?.response?.status,
          data: initError?.response?.data,
          message: initError?.message
        });
        
        toast({
          title: 'GroupMe Connection Error',
          description: 'Could not start GroupMe connection. Please try again later.',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        
        setIsConnecting(false);
        return;
      }

      // Ensure we're using the correct OAuth endpoint (authorize, not login_dialog)
      if (authUrl.includes('login_dialog')) {
        console.warn('Detected outdated login_dialog endpoint, replacing with authorize endpoint');
        authUrl = authUrl.replace('login_dialog', 'authorize');
      }
      
      // Ensure we're using the implicit flow by adding response_type=token
      if (!authUrl.includes('response_type=token')) {
        console.log('Adding response_type=token to ensure implicit flow');
        authUrl = authUrl + (authUrl.includes('?') ? '&' : '?') + 'response_type=token';
      }

      // Add cache-busting parameter to prevent using cached URL
      authUrl = authUrl + (authUrl.includes('?') ? '&' : '?') + '_cb=' + Date.now();
      console.log('Final auth URL with cache busting:', authUrl);

      // Store OAuth state in sessionStorage
      try {
        sessionStorage.setItem('groupme_auth_in_progress', 'true');
        sessionStorage.setItem('groupme_auth_user_id', user.id);
        sessionStorage.setItem('groupme_auth_timestamp', Date.now().toString());
        console.log('Saved OAuth state to sessionStorage');
      } catch (storageError) {
        console.warn('Could not save OAuth state to sessionStorage:', storageError);
        // Continue anyway - this is just a precaution
      }

      // Use a timeout to ensure UI updates before redirect
      setTimeout(() => {
        try {
          // Redirect to GroupMe OAuth page
          console.log('Redirecting to:', authUrl);
          window.location.href = authUrl;
        } catch (redirectError) {
          console.error('Failed to redirect to GroupMe OAuth:', redirectError);
          toast({
            title: 'Navigation Error',
            description: 'Could not navigate to GroupMe. Please try again.',
            status: 'error',
            duration: 5000,
            isClosable: true
          });
          setIsConnecting(false);
        }
      }, 100);
      
    } catch (error) {
      // This catch block handles any other unexpected errors
      console.error('Unexpected error in GroupMe OAuth flow:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      setIsConnecting(false);
    }
    // Note: We don't set isConnecting to false here because we're redirecting
  };

  // Safely import the actual component only when needed
  const GroupMeChatActual = React.lazy(() =>
    import('./GroupMeChat').then((module) => ({ default: module.default }))
  );

  // Show loading state during initialization
  if (!isInitialized) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
        width="100%"
        p={4}
        backgroundColor="black"
        color="gray.400"
      >
        <Spinner size="sm" mr={2} />
        <Text>Loading chat...</Text>
      </Box>
    );
  }

  // If not connected, show connect button
  if (!isConnected && !config?.accessToken) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100%"
        width="100%"
        p={4}
        backgroundColor="black"
        color="gray.400"
      >
        <Text mb={4}>Connect your GroupMe account to start chatting.</Text>
        <Button 
          colorScheme="blue" 
          onClick={handleConnectGroupMe}
          isLoading={isConnecting}
        >
          Connect GroupMe
        </Button>
      </Box>
    );
  }

  // Wrap the actual component in error boundary and suspense
  return (
    <GroupMeChatErrorBoundary>
      <React.Suspense
        fallback={
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
            p={4}
            backgroundColor="black"
            color="gray.400"
          >
            <Spinner size="md" />
          </Box>
        }
      >
        <GroupMeChatActual {...props} />
      </React.Suspense>
    </GroupMeChatErrorBoundary>
  );
};

export default GroupMeChatWrapper;
