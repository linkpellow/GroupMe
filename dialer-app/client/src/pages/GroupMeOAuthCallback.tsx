import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Spinner, Text, Alert, AlertIcon, VStack, Button } from '@chakra-ui/react';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';

const GroupMeOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    console.log('=== GroupMe OAuth Callback Page ===');
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    
    try {
      // GroupMe returns the token in the URL fragment (after #)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const state = hashParams.get('state');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      console.log('Parsed parameters:');
      console.log('- access_token:', accessToken ? 'Present' : 'Missing');
      console.log('- state:', state);
      console.log('- error:', error);
      console.log('- error_description:', errorDescription);

      if (error) {
        console.error('OAuth error from GroupMe:', error, errorDescription);
        setError(`GroupMe authorization failed: ${errorDescription || error}`);
        setIsProcessing(false);
        return;
      }

      if (!accessToken) {
        console.error('No access token in URL');
        setError('No access token received from GroupMe');
        setIsProcessing(false);
        return;
      }

      if (!state) {
        console.error('No state parameter in URL');
        setError('Invalid OAuth response - missing state parameter');
        setIsProcessing(false);
        return;
      }

      console.log('Sending token to backend...');
      // Send the token to the backend
      await groupMeOAuthService.handleOAuthCallback(accessToken, state);
      
      console.log('OAuth callback successful, token saved.');
      // Persist sidebar to Page 2 (index 1) so chat panel is visible when the user returns
      localStorage.setItem('sidebarPage', '1');

      // Stop processing so UI can show success state
      setIsProcessing(false);
      setError(null);
      // Note: No automatic redirect – user stays here and can navigate manually
    } catch (err: any) {
      console.error('Error in OAuth callback:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to connect GroupMe';
      setError(errorMessage);
      setIsProcessing(false);
      
      // No automatic redirect on error, let user see the message
    }
  };

  return (
    <Box 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="100vh"
      bg="gray.50"
    >
      <VStack spacing={4} p={8} bg="white" borderRadius="lg" boxShadow="md">
        {isProcessing ? (
          <>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text fontSize="lg" fontWeight="medium">
              Connecting your GroupMe account...
            </Text>
            <Text fontSize="sm" color="gray.600">
              Please wait while we complete the authorization
            </Text>
          </>
        ) : error ? (
          <>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
            <Button mt={4} onClick={() => navigate('/integrations')}>
              Back to Integrations
            </Button>
          </>
        ) : (
          <>
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              GroupMe successfully connected! You can close this tab and open the chat from the CRM sidebar.
            </Alert>
            <Button mt={4} colorScheme="green" onClick={() => navigate('/leads')}>
              Go to Leads
            </Button>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default GroupMeOAuthCallback; 