import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Spinner, Text, Alert, AlertIcon, VStack, Button, Code, Input, FormControl, FormLabel } from '@chakra-ui/react';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';

const GroupMeOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

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
      const code = searchParams.get('code');
      const state = searchParams.get('state') || hashParams.get('state') || '';

      if (accessToken) {
        // Preferred path: Implicit flow with access_token
        console.log('Access token found in URL, using implicit flow');
        await groupMeOAuthService.saveAccessToken(accessToken);
        setSuccess(true);
      } else if (code && state) {
        // Fallback: Code flow if GroupMe returns a code despite requesting token
        console.log('Authorization code found in URL, attempting code flow');
        try {
          await groupMeOAuthService.handleOAuthCode(code, state);
          setSuccess(true);
        } catch (codeError: any) {
          console.error('Code flow failed:', codeError);
          // If code flow fails due to missing client secret, show a more helpful error
          if (codeError.response?.data?.message?.includes('client secret not configured')) {
            throw new Error(
              'Server is missing GroupMe client secret required for authorization code flow. ' +
              'Please use the "Enter Access Token Manually" option instead.'
            );
          }
          throw codeError;
        }
      } else {
        // No token or code found
        throw new Error(
          'GroupMe did not return an access token or authorization code. ' +
          'Please try the "Enter Access Token Manually" option below.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect GroupMe');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!manualToken.trim()) {
      setError('Please enter a valid access token');
      return;
    }
    
    setIsSubmittingManual(true);
    try {
      await groupMeOAuthService.saveAccessToken(manualToken.trim());
      setSuccess(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save access token');
    } finally {
      setIsSubmittingManual(false);
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
            
            {/* Manual token entry form */}
            <Box width="100%" mt={4}>
              <FormControl>
                <FormLabel>Enter your GroupMe access token manually:</FormLabel>
                <Input 
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste your access token here"
                  size="md"
                />
              </FormControl>
              <Button 
                mt={2} 
                colorScheme="blue" 
                onClick={handleManualTokenSubmit}
                isLoading={isSubmittingManual}
                isDisabled={!manualToken.trim()}
                width="100%"
              >
                Connect with Token
              </Button>
              <Text fontSize="xs" mt={2} color="gray.500">
                You can get your access token from <a href="https://dev.groupme.com/session/new" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'underline'}}>dev.groupme.com</a>
              </Text>
            </Box>
            
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