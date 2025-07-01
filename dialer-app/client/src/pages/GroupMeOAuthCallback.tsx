import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Spinner, Text, Alert, AlertIcon, VStack, Button, Code } from '@chakra-ui/react';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';

const GroupMeOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    console.log('=== GroupMe OAuth Callback Page ===');
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    
    // Enhanced debug info
    const debugData = {
      url: window.location.href,
      hash: window.location.hash,
      hostname: window.location.hostname,
      pathname: window.location.pathname
    };
    setDebugInfo(JSON.stringify(debugData, null, 2));
    
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);

      // GroupMe implicit flow may deliver the token in either query or hash.
      const accessToken = searchParams.get('access_token') || hashParams.get('access_token');

      // Keep reading state for optional CSRF verification / logging
      const state = searchParams.get('state') || hashParams.get('state') || '';

      if (accessToken) {
        // Implicit flow – token delivered directly.
        await groupMeOAuthService.saveAccessToken(accessToken);
      } else if (searchParams.get('code')) {
        // Authorization-code flow – exchange code server-side.
        const code = searchParams.get('code') as string;
        await groupMeOAuthService.handleOAuthCode(code, state);
      } else {
        throw new Error('GroupMe callback missing both access_token and code parameters.');
      }

      setSuccess(true);
      setIsProcessing(false);
      // Optionally, reload or refetch connection status/groups here
    } catch (err: any) {
      setError(err.message || 'Failed to connect GroupMe');
      setIsProcessing(false);
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
        ) : success ? (
          <>
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              GroupMe successfully connected! You can close this tab and open the chat from the CRM sidebar.
            </Alert>
            <Button mt={4} colorScheme="green" onClick={() => navigate('/leads')}>
              Go to Leads
            </Button>
          </>
        ) : null}
      </VStack>
    </Box>
  );
};

export default GroupMeOAuthCallback; 