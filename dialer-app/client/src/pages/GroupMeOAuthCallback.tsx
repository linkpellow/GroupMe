import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Spinner, Text, Alert, AlertIcon, VStack, Button, Code } from '@chakra-ui/react';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';

const GroupMeOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    console.log('=== GroupMe OAuth Callback Page ===');
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);
    
    // Enhanced debug info
    const debugData = {
      url: window.location.href,
      hash: window.location.hash,
      search: window.location.search,
      hostname: window.location.hostname,
      pathname: window.location.pathname
    };
    setDebugInfo(JSON.stringify(debugData, null, 2));
    
    try {
      // GroupMe returns the code in the query string (after ?)
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('Parsed parameters:');
      console.log('- code:', code ? 'Present' : 'Missing');
      console.log('- state:', state);
      console.log('- error:', error);
      console.log('- error_description:', errorDescription);

      if (error) {
        console.error('OAuth error from GroupMe:', error, errorDescription);
        setError(`GroupMe authorization failed: ${errorDescription || error}`);
        setIsProcessing(false);
        return;
      }

      if (!code) {
        console.error('No code in URL');
        setError('No authorization code received from GroupMe. Please check that you authorized the application.');
        setIsProcessing(false);
        return;
      }

      if (!state) {
        console.error('No state parameter in URL');
        setError('Invalid OAuth response - missing state parameter');
        setIsProcessing(false);
        return;
      }

      console.log('Sending code to backend...');
      // Send the code to the backend
      await groupMeOAuthService.handleOAuthCallback(code, state);
      
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
      <VStack spacing={4} p={8} bg="white" borderRadius="lg" boxShadow="md" maxWidth="600px" width="100%">
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
            {debugInfo && (
              <Box mt={4} p={3} bg="gray.50" borderRadius="md" width="100%" overflowX="auto">
                <Text fontSize="sm" fontWeight="bold" mb={2}>Debug Information:</Text>
                <Code display="block" whiteSpace="pre" p={2} borderRadius="md">
                  {debugInfo}
                </Code>
              </Box>
            )}
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