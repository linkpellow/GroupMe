import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Container,
  SimpleGrid,
  VStack,
  Icon,
  Button,
  Flex,
  Input,
  FormControl,
  FormLabel,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
} from '@chakra-ui/react';
import {
  FaPlug,
  FaCalendarAlt,
  FaPlusCircle,
  FaTrash,
  FaUsers,
  FaUserTie,
  FaTimes,
  FaPaperPlane,
} from 'react-icons/fa';
import { FaSms } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import GroupMeSettings from '../components/GroupMeSettings';
import NextGenCredentialCard from '../components/NextGenCredentialCard';

interface Integration {
  name: string;
  description: string;
  isActive: boolean;
  icon: any;
  component: React.ReactNode;
}

interface CalendlyEvent {
  id: string;
  name: string;
  url: string;
  duration: number;
}

const CalendlyIntegration: React.FC = () => {
  const [calendlyUser, setCalendlyUser] = useState<string>('');
  const [calendlyToken, setCalendlyToken] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [events, setEvents] = useState<CalendlyEvent[]>([]);
  const [newEventName, setNewEventName] = useState<string>('');
  const [newEventDuration, setNewEventDuration] = useState<string>('30');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    // Check if user has Calendly integration saved
    const checkCalendlyIntegration = async () => {
      try {
        setIsLoading(true);
        console.log('Checking Calendly integration status...');
        const response = await axiosInstance.get('integrations/calendly');
        console.log('Calendly integration response:', response.data);

        setApiAvailable(true);

        if (response.data && response.data.token) {
          setCalendlyToken(response.data.token);
          setCalendlyUser(response.data.user || '');
          setIsConnected(true);

          // If connected, fetch events
          if (response.data.events && Array.isArray(response.data.events)) {
            setEvents(response.data.events);
          }
        }
      } catch (error: any) {
        // Handle 401 Unauthorized errors gracefully - this is expected when not logged in
        if (error.response && error.response.status === 401) {
          console.log('Authentication required for Calendly integration - user needs to log in');
          setApiAvailable(true);
        } else if (error.response && error.response.status === 404) {
          console.error(
            'Calendly integration endpoint not found. Endpoint: /api/integrations/calendly'
          );
          setApiAvailable(false);

          // Add more detail to identify exactly where the 404 is coming from
          console.error('Error details:', {
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            fullURL: error.config?.baseURL + error.config?.url,
          });

          // Create sample data for better UX even when API is unavailable
          setEvents([
            {
              id: 'sample-1',
              name: 'Demo Call (15min)',
              url: 'demo-call',
              duration: 15,
            },
            {
              id: 'sample-2',
              name: 'Consultation (30min)',
              url: 'consultation',
              duration: 30,
            },
          ]);
        } else {
          console.error('Failed to fetch Calendly integration:', error);
          setApiAvailable(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    checkCalendlyIntegration();

    // Set up a retry interval for checking the connection, but only if API is available
    const intervalId = setInterval(() => {
      if (!isConnected && apiAvailable) {
        checkCalendlyIntegration();
      }
    }, 30000); // Retry every 30 seconds if not connected (increased from 10s to reduce load)

    // Clean up the interval
    return () => clearInterval(intervalId);
  }, [isConnected, apiAvailable, toast]);

  const handleConnect = async () => {
    if (!apiAvailable) {
      toast({
        title: 'API Unavailable',
        description:
          'The Calendly integration API is currently unavailable. Please try again later.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });

      // For demo purposes, simulate a successful connection
      setIsConnected(true);
      setEvents([
        {
          id: 'sample-1',
          name: 'Demo Call (15min)',
          url: 'demo-call',
          duration: 15,
        },
        {
          id: 'sample-2',
          name: 'Consultation (30min)',
          url: 'consultation',
          duration: 30,
        },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // This would normally redirect to Calendly OAuth flow
      // For demo purposes, we'll simulate a direct connection
      const response = await axiosInstance.post('integrations/calendly', {
        token: calendlyToken,
        user: calendlyUser,
      });

      if (response.data.success) {
        setIsConnected(true);
        toast({
          title: 'Connected to Calendly',
          description: 'Your Calendly account has been successfully connected.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Simulate some default events
        const defaultEvents = [
          {
            id: '1',
            name: 'Discovery Call',
            url: 'discovery-call',
            duration: 30,
          },
          {
            id: '2',
            name: 'Follow-up Meeting',
            url: 'follow-up-meeting',
            duration: 45,
          },
        ];
        setEvents(defaultEvents);
      }
    } catch (error: any) {
      // Handle 401 Unauthorized errors by redirecting to login
      if (error.response && error.response.status === 401) {
        console.log('Authentication required for Calendly integration');
        toast({
          title: 'Authentication Required',
          description: 'Please log in to connect your Calendly account.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      } else if (error.response && error.response.status === 404) {
        setApiAvailable(false);
        toast({
          title: 'API Unavailable',
          description:
            'The Calendly integration API is currently unavailable. Sample data will be used for demonstration.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });

        // For demo purposes, simulate a successful connection
        setIsConnected(true);
        setEvents([
          {
            id: 'sample-1',
            name: 'Demo Call (15min)',
            url: 'demo-call',
            duration: 15,
          },
          {
            id: 'sample-2',
            name: 'Consultation (30min)',
            url: 'consultation',
            duration: 30,
          },
        ]);
      } else {
        console.error('Failed to connect Calendly:', error);
        toast({
          title: 'Connection Failed',
          description:
            error.response?.data?.message ||
            'Unable to connect to Calendly. Please check your credentials.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.delete('integrations/calendly');
      setCalendlyToken('');
      setCalendlyUser('');
      setIsConnected(false);
      setEvents([]);
      toast({
        title: 'Disconnected from Calendly',
        description: 'Your Calendly account has been disconnected.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      // Handle 401 Unauthorized errors gracefully
      if (error.response && error.response.status === 401) {
        console.log('Authentication required for Calendly integration');
        // Force disconnect on client side anyway
        setCalendlyToken('');
        setCalendlyUser('');
        setIsConnected(false);
        setEvents([]);
        toast({
          title: 'Disconnected from Calendly',
          description: 'Your Calendly account has been disconnected from this device.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else {
        console.error('Failed to disconnect Calendly:', error);
        toast({
          title: 'Disconnect Failed',
          description: error.response?.data?.message || 'Unable to disconnect from Calendly.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEventName.trim()) {
      toast({
        title: 'Event name required',
        description: 'Please enter a name for your event.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const newEvent = {
        id: `event-${Date.now()}`,
        name: newEventName,
        url: newEventName.toLowerCase().replace(/\s+/g, '-'),
        duration: parseInt(newEventDuration, 10),
      };

      const updatedEvents = [...events, newEvent];

      // Optimistically update UI first
      setEvents(updatedEvents);
      setNewEventName('');
      setNewEventDuration('30');
      onClose();

      // Then save to backend
      try {
        await axiosInstance.put('integrations/calendly/events', {
          events: updatedEvents,
        });

        toast({
          title: 'Event Added',
          description: `${newEventName} has been added to your Calendly events.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error: any) {
        // If backend save fails, restore previous state
        if (error.response && error.response.status === 401) {
          console.log('Authentication required for Calendly integration');
        } else {
          // Revert the optimistic update
          setEvents(events);
          console.error('Failed to save event to backend:', error);
          toast({
            title: 'Failed to Save Event',
            description:
              error.response?.data?.message ||
              'An error occurred while saving the event to the server.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to add event:', error);
      toast({
        title: 'Failed to Add Event',
        description: 'An error occurred while adding the event.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Optimistically update UI first
      const previousEvents = [...events];
      const updatedEvents = events.filter((event) => event.id !== eventId);
      setEvents(updatedEvents);

      // Then save to backend
      try {
        await axiosInstance.put('integrations/calendly/events', {
          events: updatedEvents,
        });

        toast({
          title: 'Event Removed',
          description: 'The event has been removed from your Calendly events.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      } catch (error: any) {
        // If backend save fails, restore previous state
        if (error.response && error.response.status === 401) {
          console.log('Authentication required for Calendly integration');
        } else {
          // Revert the optimistic update
          setEvents(previousEvents);
          console.error('Failed to save event deletion to backend:', error);
          toast({
            title: 'Failed to Remove Event',
            description:
              error.response?.data?.message ||
              'An error occurred while removing the event from the server.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      toast({
        title: 'Failed to Remove Event',
        description: 'An error occurred while removing the event.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box borderWidth={1} borderRadius="lg" overflow="hidden" p={6}>
      <VStack align="start" spacing={6} width="100%">
        <Box display="flex" alignItems="center" width="100%" justifyContent="space-between">
          <Heading as="h3" size="md" display="flex" alignItems="center">
            <Icon as={FaCalendarAlt} mr={2} color="blue.500" /> Calendly Integration
            {!apiAvailable && (
              <Text fontSize="xs" color="orange.500" ml={2}>
                (Demo Mode)
              </Text>
            )}
          </Heading>
          {isConnected ? (
            <Button colorScheme="red" size="sm" onClick={handleDisconnect} isLoading={isLoading}>
              Disconnect
            </Button>
          ) : null}
        </Box>

        {!isConnected ? (
          <Box width="100%">
            <Text mb={4}>Connect your Calendly account to book appointments with leads.</Text>
            {!apiAvailable && (
              <Text color="orange.500" mb={3} fontSize="sm">
                Note: The Calendly API is currently unavailable. Enter any credentials to use demo
                mode.
              </Text>
            )}
            <FormControl mb={4}>
              <FormLabel>Calendly Username or Email</FormLabel>
              <Input
                value={calendlyUser}
                onChange={(e) => setCalendlyUser(e.target.value)}
                placeholder="username@example.com"
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Calendly API Token</FormLabel>
              <Input
                type="password"
                value={calendlyToken}
                onChange={(e) => setCalendlyToken(e.target.value)}
                placeholder="Enter your Calendly API token"
              />
            </FormControl>
            <Button colorScheme="blue" onClick={handleConnect} isLoading={isLoading}>
              Connect to Calendly
            </Button>
          </Box>
        ) : (
          <Box width="100%">
            <Text mb={4}>
              Connected as <strong>{calendlyUser}</strong>
            </Text>

            <Heading as="h4" size="sm" mb={4} mt={6}>
              Your Calendly Events
            </Heading>

            {events.length === 0 ? (
              <Text color="gray.500">
                No events configured. Add your first event to get started.
              </Text>
            ) : (
              <VStack align="stretch" spacing={3} mb={4}>
                {events.map((event) => (
                  <Flex
                    key={event.id}
                    borderWidth={1}
                    borderRadius="md"
                    p={3}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Text fontWeight="bold">{event.name}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {event.duration} minutes • {window.location.origin}
                        /calendly/{event.url}
                      </Text>
                    </Box>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <FaTrash />
                    </Button>
                  </Flex>
                ))}
              </VStack>
            )}

            <Button leftIcon={<FaPlusCircle />} colorScheme="blue" onClick={onOpen}>
              Add Event
            </Button>
          </Box>
        )}
      </VStack>

      {/* Add Event Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Calendly Event</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Event Name</FormLabel>
              <Input
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="e.g., Discovery Call"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Duration (minutes)</FormLabel>
              <Input
                type="number"
                value={newEventDuration}
                onChange={(e) => setNewEventDuration(e.target.value)}
                min="15"
                step="15"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleAddEvent}>
              Add Event
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

const TextDripIntegration: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState('https://api.textdrip.com/api');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleLogin = async () => {
    if (!apiKey && (!email || !password)) {
      toast({ title: 'Provide API key or username & password', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    try {
      setIsLoading(true);
      await axiosInstance.post('textdrip/connect', { baseUrl, email, password, apiKey });
      toast({ title: 'Connected to TextDrip', status: 'success', duration: 3000, isClosable: true });
      setIsConnected(true);
    } catch (error: any) {
      toast({ title: 'Login failed', description: error?.response?.data?.message || 'Unable to connect', status: 'error', duration: 4000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box borderWidth={1} borderRadius="lg" overflow="hidden" p={6}>
      <VStack align="start" spacing={6} width="100%">
        <Box display="flex" alignItems="center" width="100%" justifyContent="space-between">
          <Heading as="h3" size="md" display="flex" alignItems="center">
            <Icon as={FaSms} mr={2} color="orange.400" /> TextDrip Integration
          </Heading>
        </Box>

        {!isConnected ? (
          <Box width="100%">
            <Text mb={4}>Login to your TextDrip account to enable SMS campaigns & quick-drip.</Text>
            <FormControl mb={4}>
              <FormLabel>Email</FormLabel>
              <Input placeholder="user@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Password</FormLabel>
              <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            </FormControl>
            <Text fontSize="sm" color="gray.500" mb={2}>— or use API Key —</Text>
            <FormControl mb={4}>
              <FormLabel>API Key</FormLabel>
              <Input value={apiKey} onChange={(e)=>setApiKey(e.target.value)} placeholder="TD_xxx" />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Base URL</FormLabel>
              <Input value={baseUrl} onChange={(e)=>setBaseUrl(e.target.value)} />
            </FormControl>
            <Button colorScheme="orange" leftIcon={<FaPaperPlane />} onClick={handleLogin} isLoading={isLoading}>
              Connect to TextDrip
            </Button>
          </Box>
        ) : (
          <Box>
            <Text>Connected as <strong>{email}</strong></Text>
            <Text fontSize="sm" color="gray.500" mt={2}>You can now use Quick-Drip and Add-to-Campaign with your own TextDrip account.</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

const Integrations: React.FC = () => {
  useAuth(); // Ensure user is authenticated

  // List of available integrations
  const integrations: Integration[] = [
    {
      name: 'Calendly',
      description: 'Connect your Calendly account to manage appointment scheduling',
      isActive: false,
      icon: FaCalendarAlt,
      component: <CalendlyIntegration />,
    },
    {
      name: 'GroupMe',
      description: 'Connect your GroupMe account for group messaging and collaboration',
      isActive: false,
      icon: FaUsers,
      component: <GroupMeSettings />,
    },
    {
      name: 'TextDrip',
      description: 'Send SMS and manage campaigns directly via TextDrip',
      isActive: false,
      icon: FaSms,
      component: <TextDripIntegration />,
    },
    // More integrations can be added here in the future
  ];

  return (
    <Container maxW="6xl" py={8}>
      <NextGenCredentialCard />
      <Box textAlign="center" mb={10}>
        <Heading as="h1" size="xl" fontWeight="bold" mb={4}>
          Integrations
        </Heading>
        <Text fontSize="lg" color="gray.600">
          Connect and manage your external services
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 1 }} spacing={8}>
        {integrations.map((integration, index) => (
          <Box key={index} borderWidth={1} borderRadius="lg" overflow="hidden">
            <Box p={6} bg="gray.50" borderBottomWidth={1}>
              <Heading as="h3" size="md" display="flex" alignItems="center">
                <Icon as={integration.icon} mr={2} color="blue.500" /> {integration.name}
              </Heading>
              <Text mt={2} color="gray.600">
                {integration.description}
              </Text>
            </Box>

            <Box bg="white">{integration.component}</Box>
          </Box>
        ))}
      </SimpleGrid>
    </Container>
  );
};

export default Integrations;
