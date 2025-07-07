import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, Spinner, Alert, AlertIcon, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';

/**
 * This component handles the GroupMe OAuth callback.
 * It extracts the access_token from the URL hash and sends it to the server.
 * Then it notifies the parent window and closes itself.
 */
const GroupMeCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('GroupMeCallbackPage: Handling OAuth callback');
      
      try {
        // Extract and process the access token from the URL hash
        const success = await groupMeOAuthService.handleImplicitCallback();
        
        if (success) {
          console.log('GroupMeCallbackPage: Token saved successfully');
          setStatus('success');
          
          // Restore the auth token from session storage if it was backed up
          try {
            const backupToken = sessionStorage.getItem('groupme_auth_token_backup');
            if (backupToken) {
              console.log('GroupMeCallbackPage: Restoring auth token from backup');
              localStorage.setItem('token', backupToken);
              sessionStorage.removeItem('groupme_auth_token_backup');
            }
          } catch (storageError) {
            console.warn('Could not restore token from sessionStorage:', storageError);
            // Continue anyway - user can log in again if needed
          }
          
          // Check if this window was opened by another window
          if (window.opener && !window.opener.closed) {
            try {
              // Notify the parent window about the successful connection
              console.log('Notifying parent window about successful connection');
              window.opener.postMessage({ type: 'GROUPME_CONNECTED', success: true }, '*');
              
              // Close this window after a short delay
              setTimeout(() => {
                window.close();
              }, 1500);
            } catch (e) {
              console.error('Error communicating with parent window:', e);
              // If communication fails, just show success message
            }
          } else {
            // If no parent window, provide a button to go back to the main app
            console.log('No parent window found, showing navigation options');
          }
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
    if (window.opener) {
      window.close();
    } else {
      navigate('/leads');
    }
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
          <Text mb={4}>This window will close automatically.</Text>
          <Button colorScheme="blue" onClick={() => window.close()}>
            Close Window
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert status="error" borderRadius="md" mb={4}>
            <AlertIcon />
            Connection failed
          </Alert>
          <Text mb={4}>{errorMessage}</Text>
          <Button colorScheme="blue" onClick={handleRetry}>
            {window.opener ? 'Close Window' : 'Return to App'}
          </Button>
        </>
      )}
    </Box>
  );
};

export default GroupMeCallbackPage; 