import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Heading,
  Text,
  useToast,
  HStack,
  IconButton,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  Badge,
  Link,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ExternalLinkIcon, ChatIcon } from '@chakra-ui/icons';
import { useGroupMeConfig } from '../context/GroupMeContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { groupMeOAuthService } from '../services/groupMeOAuth.service';
import { useAuth } from '../context/AuthContext';

const GroupMeSettings = () => {
  const { config, saveConfig, loading, error } = useGroupMeConfig();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<Date | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([{ id: '', name: '' }]);
  const [manualToken, setManualToken] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = urlParams.get('access_token');
    const state = urlParams.get('state');

    if (accessToken && state) {
      handleOAuthCallback(accessToken, state);
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const status = await groupMeOAuthService.checkConnectionStatus();
      setIsConnected(status.connected);
      if (status.connectedAt) {
        setConnectedAt(status.connectedAt);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleOAuthCallback = async (accessToken: string, state: string) => {
    setIsConnecting(true);
    try {
      await groupMeOAuthService.handleOAuthCallback(accessToken, state);

      // Clear the URL hash
      window.location.hash = '';

      toast({
        title: 'Connected Successfully',
        description: 'Your GroupMe account has been connected',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setIsConnected(true);
      setConnectedAt(new Date());

      // Fetch groups after connection
      fetchGroups();
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect your GroupMe account',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    console.log('=== GROUPME CONNECT CLICKED ===');
    console.log('Current user:', user);
    console.log('User ID:', user?.id);
    
    if (!user?.id) {
      console.error('No user ID found, user object:', user);
      toast({
        title: 'Error',
        description: 'You must be logged in to connect GroupMe',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Initiating GroupMe OAuth...');
      console.log('Calling initiateOAuth with userId:', user.id);
      
      const response = await groupMeOAuthService.initiateOAuth(user.id);
      
      console.log('OAuth response received:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));
      
      const { authUrl } = response;
      console.log('Auth URL extracted:', authUrl);

      // Validate the auth URL before redirecting
      if (!authUrl || !authUrl.includes('oauth.groupme.com')) {
        throw new Error('Invalid authorization URL received from server');
      }

      // Ensure the URL has the required parameters
      const authUrlObj = new URL(authUrl);
      if (!authUrlObj.searchParams.get('client_id') || !authUrlObj.searchParams.get('response_type')) {
        throw new Error('Authorization URL is missing required parameters');
      }

      // Redirect to GroupMe OAuth page
      console.log('About to redirect to:', authUrl);
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('=== OAUTH ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      console.error('Error response status:', error?.response?.status);
      console.error('Error stack:', error?.stack);
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.response?.data?.error || 'Failed to initiate GroupMe connection',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await groupMeOAuthService.disconnect();
      
      toast({
        title: 'Success',
        description: 'GroupMe disconnected successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setIsConnected(false);
      setConnectedAt(null);
    } catch (error: any) {
      console.error('Error disconnecting GroupMe:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to disconnect GroupMe',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/groupme/groups');
      const fetchedGroups = response.data.map((group: any) => ({
        id: group.id,
        name: group.name,
      }));

      setGroups(fetchedGroups.length > 0 ? fetchedGroups : [{ id: '', name: '' }]);

      toast({
        title: 'Groups Loaded',
        description: `Found ${fetchedGroups.length} groups in your account`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your GroupMe groups',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleAddGroup = () => {
    setGroups([...groups, { id: '', name: '' }]);
  };

  const handleRemoveGroup = (index: number) => {
    const newGroups = [...groups];
    newGroups.splice(index, 1);
    setGroups(newGroups.length > 0 ? newGroups : [{ id: '', name: '' }]);
  };

  const handleGroupChange = (index: number, field: 'id' | 'name', value: string) => {
    const newGroups = [...groups];
    newGroups[index][field] = value;
    setGroups(newGroups);
  };

  const handleSaveGroups = async () => {
    const validGroups = groups.filter((group) => group.id && group.name);
    if (validGroups.length === 0) {
      toast({
        title: 'Groups Required',
        description: 'Please add at least one group with ID and name',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Convert groups array to record format
    const groupsRecord: Record<string, string> = {};
    validGroups.forEach((group) => {
      groupsRecord[group.id] = group.name;
    });

    try {
      await saveConfig({
        ...config,
        accessToken: config?.accessToken || '',
        groups: groupsRecord,
      });

      toast({
        title: 'Groups Saved',
        description: 'Your group configuration has been saved',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error saving groups:', err);
      toast({
        title: 'Save Failed',
        description: 'Could not save group configuration',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSaveToken = async () => {
    setIsSavingToken(true);
    try {
      await groupMeOAuthService.handleManualToken(manualToken);

      toast({
        title: 'Token Saved',
        description: 'Your GroupMe token has been saved',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setManualToken('');
    } catch (error) {
      console.error('Error saving token:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save GroupMe token',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleSaveManualToken = async () => {
    if (!manualToken) {
      toast({
        title: 'Error',
        description: 'Please enter a valid GroupMe access token',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsSavingToken(true);
    try {
      await groupMeOAuthService.handleManualToken(manualToken);
      
      toast({
        title: 'Success',
        description: 'GroupMe token saved successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setIsConnected(true);
      setConnectedAt(new Date());
      setManualToken('');
    } catch (error: any) {
      console.error('Error saving manual token:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to save GroupMe token',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSavingToken(false);
    }
  };

  if (isConnecting) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Connecting to GroupMe...</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>
        GroupMe Integration
      </Heading>

      {loading ? (
        <Spinner />
      ) : error ? (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      ) : (
        <>
          {isConnected ? (
            <VStack align="start" spacing={4} mb={6}>
              <Alert status="success" mb={4}>
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">GroupMe Connected</Text>
                  {connectedAt && (
                    <Text fontSize="sm">
                      Connected since {new Date(connectedAt).toLocaleString()}
                    </Text>
                  )}
                </Box>
              </Alert>

              <Button
                leftIcon={<DeleteIcon />}
                colorScheme="red"
                variant="outline"
                onClick={handleDisconnect}
                isLoading={isDisconnecting}
              >
                Disconnect GroupMe
              </Button>
            </VStack>
          ) : (
            <VStack align="start" spacing={4} mb={6}>
              <Alert status="info" mb={4}>
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Connect your GroupMe account</Text>
                  <Text fontSize="sm">
                    Connect your GroupMe account to send and receive messages directly from the CRM.
                  </Text>
                </Box>
              </Alert>

              <Button
                leftIcon={<ChatIcon />}
                colorScheme="blue"
                onClick={handleConnect}
                isLoading={isConnecting}
              >
                Connect GroupMe
              </Button>
              
              <Divider my={4} />
              
              <Box width="100%">
                <Text fontWeight="bold" mb={2}>
                  Alternative: Enter Access Token Manually
                </Text>
                <Text fontSize="sm" mb={4}>
                  If OAuth connection fails, you can manually enter your GroupMe access token.
                  <Link 
                    href="https://dev.groupme.com/session/new" 
                    isExternal 
                    color="blue.500" 
                    ml={1}
                  >
                    Get token from dev.groupme.com <ExternalLinkIcon mx="2px" />
                  </Link>
                </Text>
                
                <HStack width="100%">
                  <Input
                    placeholder="Paste your GroupMe access token here"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    flex="1"
                  />
                  <Button
                    onClick={handleSaveManualToken}
                    isLoading={isSavingToken}
                    isDisabled={!manualToken}
                    colorScheme="blue"
                  >
                    Save Token
                  </Button>
                </HStack>
              </Box>
            </VStack>
          )}
        </>
      )}
    </Box>
  );
};

export default GroupMeSettings;
