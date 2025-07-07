import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, Spinner, Alert, AlertIcon, Button, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';

/**
 * This component handles the GroupMe OAuth callback.
 * It extracts the access_token from the URL hash and sends it to the server.
 * Then it restores the user's authentication token to prevent logout.
 */
const GroupMeCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('=== GroupMeCallbackPage: Handling OAuth callback ===');
      console.log('URL:', window.location.href);
      console.log('Hash:', window.location.hash);
      console.log('Search params:', window.location.search);
      
      // Collect debug info
      const debugData = {
        url: window.location.href,
        hash: window.location.hash ? 'present (length: ' + window.location.hash.length + ')' : 'missing',
        search: window.location.search,
        sessionStorageKeys: Object.keys(sessionStorage),
        hasBackupToken: !!sessionStorage.getItem('groupme_auth_token_backup'),
        hasLocalToken: !!localStorage.getItem('token')
      };
      setDebugInfo(JSON.stringify(debugData, null, 2));
      
      try {
        // First, ensure we have the user's auth token restored
        // This needs to happen BEFORE any API calls to prevent 401 errors
        try {
          const backupToken = sessionStorage.getItem('groupme_auth_token_backup');
          if (backupToken) {
            console.log('GroupMeCallbackPage: Restoring auth token from backup');
            localStorage.setItem('token', backupToken);
            // Keep the backup until we're sure everything worked
          } else {
            console.warn('No backup token found in sessionStorage');
          }
        } catch (storageError) {
          console.error('Error accessing sessionStorage:', storageError);
        }
        
        // Extract and process the access token from the URL hash
        const success = await groupMeOAuthService.handleImplicitCallback();
        
        if (success) {
          console.log('GroupMeCallbackPage: Token saved successfully');
          setStatus('success');
          
          // Now that we've successfully saved the token, we can remove the backup
          try {
            sessionStorage.removeItem('groupme_auth_token_backup');
            sessionStorage.removeItem('groupme_auth_in_progress');
            console.log('Removed temporary OAuth data from sessionStorage');
          } catch (storageError) {
            console.warn('Could not clean up sessionStorage:', storageError);
          }
          
          // Wait a moment before navigating to ensure state updates
          setTimeout(() => {
            try {
              navigate('/chat');
            } catch (navError) {
              console.error('Navigation error:', navError);
              // If navigation fails, provide a button for manual navigation
            }
          }, 1500);
        } else {
          console.error('GroupMeCallbackPage: Failed to save token');
          setStatus('error');
          setErrorMessage('Failed to save GroupMe token. Please try again.');
        }
      } catch (error: any) {
        console.error('GroupMeCallbackPage: Error handling callback:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
      }
    };

    handleCallback();
  }, [navigate]);

  const handleRetry = () => {
    // Clean up any leftover OAuth data
    try {
      sessionStorage.removeItem('groupme_auth_in_progress');
      sessionStorage.removeItem('groupme_auth_user_id');
      sessionStorage.removeItem('groupme_auth_timestamp');
    } catch (e) {
      console.warn('Failed to clean up sessionStorage:', e);
    }
    
    // Navigate back to the main app
    navigate('/chat');
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      p={4}
      bg="gray.50"
    >
      {status === 'loading' && (
        <>
          <Spinner size="xl" mb={4} />
          <Heading size="md" mb={2}>
            Connecting to GroupMe...
          </Heading>
          <Text>Please wait while we complete the connection.</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Alert status="success" borderRadius="md" mb={4}>
            <AlertIcon />
            GroupMe connected successfully!
          </Alert>
          <Text mb={4}>Redirecting you back to the chat...</Text>
          <Spinner size="sm" mb={4} />
          <Button colorScheme="blue" onClick={() => navigate('/chat')}>
            Go to Chat Now
          </Button>
        </>
      )}

      {status === 'error' && (
        <VStack spacing={4} align="center">
          <Alert status="error" borderRadius="md" mb={2}>
            <AlertIcon />
            Connection failed
          </Alert>
          <Text mb={2}>{errorMessage}</Text>
          <Button colorScheme="blue" onClick={handleRetry}>
            Return to Chat
          </Button>
          
          {debugInfo && (
            <Box 
              mt={6} 
              p={4} 
              bg="gray.100" 
              borderRadius="md" 
              maxW="600px" 
              w="100%" 
              overflowX="auto"
            >
              <Text fontWeight="bold" mb={2}>Debug Information:</Text>
              <Box as="pre" fontSize="xs" whiteSpace="pre-wrap">
                {debugInfo}
              </Box>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default GroupMeCallbackPage; 