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
    try {
      await groupMeOAuthService.disconnect();

      setIsConnected(false);
      setConnectedAt(null);
      setGroups([{ id: '', name: '' }]);

      toast({
        title: 'Disconnected',
        description: 'Your GroupMe account has been disconnected',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect GroupMe',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
      <VStack spacing={6} align="stretch">
        <Heading size="md">GroupMe Configuration</Heading>

        <Alert status="info">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Getting Started with GroupMe</Text>
            <Text fontSize="sm" mt={1}>
              Connect your GroupMe account to send and receive messages directly from your CRM.
              After connecting, access the chat from the sidebar or click "Open GroupMe Chat" below.
            </Text>
          </Box>
        </Alert>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Box>
          <FormLabel>Connection Status</FormLabel>
          {isConnected ? (
            <VStack align="start" spacing={2}>
              <HStack>
                <Badge colorScheme="green">Connected</Badge>
                {connectedAt && (
                  <Text fontSize="sm" color="gray.500">
                    Since {connectedAt.toLocaleDateString()}
                  </Text>
                )}
              </HStack>
              <Text fontSize="sm" color="gray.600">
                Your GroupMe account is connected. You can now send and receive messages.
              </Text>
              <Button size="sm" colorScheme="red" variant="outline" onClick={handleDisconnect}>
                Disconnect GroupMe
              </Button>
            </VStack>
          ) : (
            <VStack align="start" spacing={2}>
              <Badge colorScheme="gray">Not Connected</Badge>
              <Button colorScheme="blue" onClick={handleConnect} isLoading={loading}>
                Connect GroupMe Account
              </Button>
              <Text fontSize="xs" color="gray.500">
                You'll be redirected to GroupMe to authorize access. This is secure and your
                password is never shared.
              </Text>
            </VStack>
          )}

          <Divider my={6} />

          <Box>
            <Heading size="sm" mb={2}>Manual Token Entry</Heading>
            <Text fontSize="sm" color="gray.600" mb={3}>
              If the automatic connection fails, you can manually enter your GroupMe Access Token here.
              You can get your token from the {' '}
              <Link href="https://dev.groupme.com/applications" isExternal color="blue.500">
                GroupMe Developer site <ExternalLinkIcon mx="2px" />
              </Link>.
            </Text>
            <HStack>
              <Input
                placeholder="Enter your GroupMe Access Token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                type="password"
              />
              <Button
                colorScheme="teal"
                onClick={handleSaveToken}
                isLoading={isSavingToken}
                minW="120px"
              >
                Save Token
              </Button>
            </HStack>
          </Box>
        </Box>

        {isConnected && (
          <>
            <Divider />

            <Box>
              <HStack mb={4} justify="space-between">
                <Box>
                  <Heading size="sm">Groups</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Manage which GroupMe groups you want to access from the CRM
                  </Text>
                </Box>
                <HStack>
                  <Button
                    leftIcon={<ChatIcon />}
                    size="sm"
                    colorScheme="green"
                    onClick={() => navigate('/groupme')}
                  >
                    Open GroupMe Chat
                  </Button>
                  <Button
                    leftIcon={<AddIcon />}
                    size="xs"
                    colorScheme="blue"
                    onClick={handleAddGroup}
                    isDisabled={loading}
                  >
                    Add Group
                  </Button>
                </HStack>
              </HStack>

              <Text fontSize="xs" color="gray.500" mb={3}>
                Your GroupMe groups are loaded automatically after connecting. You can manually add or edit group IDs below if needed.
              </Text>

              <VStack spacing={3} align="stretch">
                {groups.map((group, index) => (
                  <HStack key={index}>
                    <FormControl>
                      <Input
                        value={group.id}
                        onChange={(e) => handleGroupChange(index, 'id', e.target.value)}
                        placeholder="Group ID"
                        size="sm"
                        isDisabled={loading}
                        autoComplete="off"
                        id={`group-id-${index}`}
                      />
                    </FormControl>
                    <FormControl>
                      <Input
                        value={group.name}
                        onChange={(e) => handleGroupChange(index, 'name', e.target.value)}
                        placeholder="Group Name"
                        size="sm"
                        isDisabled={loading}
                        autoComplete="off"
                        id={`group-name-${index}`}
                      />
                    </FormControl>
                    <IconButton
                      aria-label="Remove group"
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleRemoveGroup(index)}
                      isDisabled={groups.length <= 1 || loading}
                    />
                  </HStack>
                ))}
              </VStack>

              <Text fontSize="xs" color="gray.500" mt={2}>
                Tip: You can find your Group ID in the GroupMe app by opening the group settings.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Button colorScheme="blue" onClick={handleSaveGroups} isDisabled={loading}>
                Save Group Configuration
              </Button>
              <Text fontSize="xs" color="gray.500" mt={2}>
                Save your group configuration to persist your settings.
              </Text>
            </Box>
          </>
        )}

        {!isConnected && (
          <Alert status="warning" mt={4}>
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Need Help?</Text>
              <Text fontSize="sm" mt={1}>
                To connect GroupMe, you'll need a GroupMe account. The connection process is secure
                and uses OAuth - we never see your GroupMe password.
              </Text>
            </Box>
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default GroupMeSettings;
