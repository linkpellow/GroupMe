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

    // Store current auth token in sessionStorage before starting OAuth flow
    try {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        console.log('Backing up current auth token to sessionStorage');
        sessionStorage.setItem('groupme_auth_token_backup', currentToken);
        
        // Also store the current URL so we can return here after auth
        sessionStorage.setItem('groupme_return_url', window.location.pathname);
      }
    } catch (storageError) {
      console.warn('Could not save token to sessionStorage:', storageError);
      // Continue anyway - this is just a precaution
    }

    setIsConnecting(true);
    try {
      console.log('Initiating GroupMe OAuth...');
      const response = await groupMeOAuthService.initiateOAuth(user.id);
      console.log('OAuth response received:', response);
      
      let { authUrl } = response;
      if (!authUrl || !authUrl.includes('oauth.groupme.com')) {
        throw new Error('Invalid authorization URL received from server');
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
      } catch (storageError) {
        console.warn('Could not save OAuth state to sessionStorage:', storageError);
        // Continue anyway - this is just a precaution
      }

      // Set up event listener for message from popup
      const messageHandler = (event: MessageEvent) => {
        console.log('Received message from popup:', event.data);
        
        // Check if this is our success message
        if (event.data && event.data.type === 'GROUPME_CONNECTED' && event.data.success) {
          console.log('GroupMe connected successfully via popup');
          
          // Remove the event listener
          window.removeEventListener('message', messageHandler);
          
          // Refresh groups to show the connected state
          if (refreshGroups) {
            console.log('Refreshing groups after successful connection');
            refreshGroups()
              .then(() => {
                setIsConnected(true);
                setIsConnecting(false);
                
                toast({
                  title: 'GroupMe Connected',
                  description: 'Your GroupMe account has been connected successfully.',
                  status: 'success',
                  duration: 4000,
                  isClosable: true,
                });
              })
              .catch(err => {
                console.error('Error refreshing groups after connection:', err);
                setIsConnecting(false);
              });
          } else {
            setIsConnected(true);
            setIsConnecting(false);
          }
        }
      };
      
      // Add the event listener
      window.addEventListener('message', messageHandler);
      
      // Open the OAuth URL in a popup window
      const popupWidth = 600;
      const popupHeight = 700;
      const left = (window.innerWidth - popupWidth) / 2 + window.screenX;
      const top = (window.innerHeight - popupHeight) / 2 + window.screenY;
      
      const popup = window.open(
        authUrl,
        'groupme-oauth',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      if (!popup) {
        // Popup was blocked
        window.removeEventListener('message', messageHandler);
        console.error('Popup was blocked by the browser');
        toast({
          title: 'Popup Blocked',
          description: 'Please allow popups for this site and try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsConnecting(false);
        return;
      }
      
      // Set up a check to see if the popup was closed manually
      const popupCheckInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(popupCheckInterval);
          window.removeEventListener('message', messageHandler);
          setIsConnecting(false);
          console.log('OAuth popup was closed manually');
        }
      }, 1000);
      
      // Clean up after 5 minutes (failsafe)
      setTimeout(() => {
        clearInterval(popupCheckInterval);
        window.removeEventListener('message', messageHandler);
        if (!isConnected) {
          setIsConnecting(false);
          console.warn('OAuth flow timed out after 5 minutes');
        }
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error initiating GroupMe OAuth:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to GroupMe. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
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
