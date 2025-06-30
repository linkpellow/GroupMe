import React, { useState, useEffect } from 'react';
import { Box, Spinner, Text, Button } from '@chakra-ui/react';
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
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Initiating GroupMe OAuth...');
      const response = await groupMeOAuthService.initiateOAuth(user.id);
      console.log('OAuth response received:', response);
      
      const { authUrl } = response;
      if (!authUrl || !authUrl.includes('oauth.groupme.com')) {
        throw new Error('Invalid authorization URL received from server');
      }

      // Redirect to GroupMe OAuth page
      console.log('Redirecting to:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating GroupMe OAuth:', error);
      setIsConnecting(false);
    }
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
