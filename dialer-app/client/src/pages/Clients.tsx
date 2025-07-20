import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Input,
  Progress,
  Spinner,
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack,
  Avatar,
  Divider,
  Alert,
  AlertIcon,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUserTie,
  FaFileAlt,
  FaFilePdf,
  FaUpload,
  FaDownload,
  FaTrash,
  FaEdit,
  FaCopy,
  FaClipboardList,
  FaCheck,
  FaExclamationCircle,
  FaTrashAlt,
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '../context/NotesContext';
import axiosInstance from '../api/axiosInstance';
import { Lead } from '../types/Lead';
import NotesEditor from '../components/NotesEditor';
import { dialPhone } from '../utils/dial';
import { useCallCountsContext } from '../context/CallCountsContext';

interface Client extends Lead {
  policyDocuments?: PolicyDocument[];
}

interface PolicyDocument {
  _id: string;
  clientId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  fileUrl: string;
}

// Constants
const NOTES_STORAGE_KEY_PREFIX = 'client_notes_';
const DELETED_DOCS_STORAGE_KEY = 'deleted_policy_documents';

// Utility to hide auto-import metadata but keep accessible
function splitMetadata(raw: string | undefined) {
  if (!raw) return { metadata: '', visible: '' };
  const looksLikeJson = raw.trim().startsWith('{') && raw.includes('purchase_id');
  const looksLikeFormattedMeta = /New .*? Lead/.test(raw) && raw.includes('Imported on:');
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return { metadata: raw, visible: '' };
  } catch (_) {}
  if (looksLikeJson || looksLikeFormattedMeta) return { metadata: raw, visible: '' };
  return { metadata: '', visible: raw };
}

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { getNotes, updateNotes } = useNotes();
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    [key: string]: 'idle' | 'saving' | 'saved' | 'error';
  }>({});
  const [lastSavedTime, setLastSavedTime] = useState<{ [key: string]: Date }>({});
  const [policyDocuments, setPolicyDocuments] = useState<PolicyDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileRejected, setFileRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deletedDocumentIds, setDeletedDocumentIds] = useState<string[]>(() => {
    const stored = localStorage.getItem(DELETED_DOCS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Documents Modal
  const { isOpen: isDocsOpen, onOpen: onDocsOpen, onClose: onDocsClose } = useDisclosure();
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocIds, setDeletingDocIds] = useState<Set<string>>(new Set());

  // CRM unique call counter
  const { increment } = useCallCountsContext();

  // Theme colors
  const bgColor = useColorModeValue('rgba(248, 250, 252, 0.9)', 'rgba(26, 32, 44, 0.9)');
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.5)', 'rgba(45, 55, 72, 0.5)');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const highlightColor = useColorModeValue('orange.500', 'orange.400');

  // Wrapper that delegates to NotesContext.updateNotes while tracking local UI status
  const saveClientNotes = useCallback(
    async (clientId: string, newNotes: string) => {
      // Update local UI status immediately
      setSaveStatus((prev) => ({ ...prev, [clientId]: 'saving' }));

      try {
        await updateNotes(clientId, newNotes);

        setSaveStatus((prev) => ({ ...prev, [clientId]: 'saved' }));
        setLastSavedTime((prev) => ({ ...prev, [clientId]: new Date() }));

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setSaveStatus((prev) => ({ ...prev, [clientId]: 'idle' }));
        }, 3000);
      } catch (error) {
        console.error('Error saving notes:', error);
        setSaveStatus((prev) => ({ ...prev, [clientId]: 'error' }));

        toast({
          title: 'Failed to save notes',
          description: 'Your changes could not be saved.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [updateNotes, toast]
  );

  // Get client notes with fallbacks
  const getClientNotes = (clientId: string) => {
    // First try NotesContext – empty string is a valid value (meaning "cleared")
    const contextNotes = getNotes(clientId);
    if (contextNotes !== undefined) return contextNotes; // may be ""

    // Then try localStorage (distinguish between null vs empty-string)
    const localNotes = localStorage.getItem(`${NOTES_STORAGE_KEY_PREFIX}${clientId}`);
    if (localNotes !== null) return localNotes; // may be ""

    // Finally fall back to notes on the client object (parsed to hide metadata)
    const client = clients.find((c) => c._id === clientId);
    const notesRaw = client?.notes ?? '';
    return splitMetadata(notesRaw).visible;
  };

  // Get last saved time
  const getLastSaved = (clientId: string) => lastSavedTime[clientId];

  // Handle notes change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // If we have a selected client, trigger auto-save
    if (selectedClient) {
      saveClientNotes(selectedClient._id, newValue);
    }
  };

  // Circuit breaker state to prevent excessive API calls
  const lastRefreshTime = useRef(0);
  const refreshCooldownMs = 1000; // Minimum 1 second between refresh calls

  // Use ref to store the getNotes function to avoid dependency issues
  const getNotesRef = useRef(getNotes);
  useEffect(() => {
    getNotesRef.current = getNotes;
  }, [getNotes]);

  // Fetch clients with circuit breaker protection
  const refreshClients = useCallback(async () => {
      // Circuit breaker: Prevent calling if we've called recently
      const now = Date.now();
      if (now - lastRefreshTime.current < refreshCooldownMs) {
        console.log('Clients refresh rate limited');
        return;
      }
      lastRefreshTime.current = now;

      setIsLoading(true);
      setError(null);
      try {
        // Query leads with SOLD disposition
        const response = await axiosInstance.get('leads', {
          params: {
            dispositions: 'SOLD',
            getAllResults: 'true', // Get all results without pagination
          },
        });

        if (response.data && response.data.leads) {
          // Process clients one by one to ensure we get the most up-to-date notes
          const clientsWithLatestNotes = response.data.leads.map((client: Client) => {
            // First check the NotesContext for the most up-to-date notes
            const notesFromContext = getNotesRef.current(client._id);

            // If we have notes from context, use those (highest priority)
            if (notesFromContext) {
              return {
                ...client,
                notes: notesFromContext,
              };
            }

            // Check for saved notes in localStorage as fallback
            const localNotes = localStorage.getItem(`${NOTES_STORAGE_KEY_PREFIX}${client._id}`);

            // If we have local notes, update the client object
            if (localNotes) {
              return {
                ...client,
                notes: localNotes,
              };
            }

            // Otherwise return client with original notes
            return client;
          });

          setClients(clientsWithLatestNotes);
          setFilteredClients(clientsWithLatestNotes);
        } else {
          setClients([]);
          setFilteredClients([]);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError('Failed to load clients. Please try again.');
      } finally {
        setIsLoading(false);
      }
  }, []); // Remove getNotes dependency to prevent infinite loops

  // Listen for notes updates
  useEffect(() => {
    const handleNotesUpdated = (e: CustomEvent) => {
      const { leadId, notes } = e.detail;
      if (leadId && notes !== undefined) {
        // If user is actively typing in this client's editor, skip to avoid cursor/focus jumps
        if (editingNotes && selectedClient && selectedClient._id === leadId) {
          return;
        }

        // Otherwise propagate update so lists reflect newest note
        setClients((prevClients) =>
          prevClients.map((client) =>
            client._id === leadId && client.notes !== notes ? { ...client, notes } : client
          )
        );

        setFilteredClients((prevFiltered) =>
          prevFiltered.map((client) =>
            client._id === leadId && client.notes !== notes ? { ...client, notes } : client
          )
        );
      }
    };

    // Listen for the notesUpdated event
    window.addEventListener('notesUpdated', handleNotesUpdated as EventListener);

    return () => {
      window.removeEventListener('notesUpdated', handleNotesUpdated as EventListener);
    };
  }, [editingNotes, selectedClient]);

  // Reset notes editing state when selected client changes
  useEffect(() => {
    if (selectedClient) {
      setEditingNotes(false);
    }
  }, [selectedClient]);

  // Focus the textarea when entering edit mode
  useEffect(() => {
    if (editingNotes && notesTextareaRef.current) {
      notesTextareaRef.current.focus();
    }
  }, [editingNotes]);

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = clients.filter(
      (client) =>
        client.name?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.phone?.includes(query) ||
        client.state?.toLowerCase().includes(query) ||
        client.city?.toLowerCase().includes(query)
    );

    setFilteredClients(results);
  }, [searchQuery, clients]);

  // Initial fetch on component mount
  useEffect(() => {
    refreshClients();
  }, []); // Empty dependency array since refreshClients is now stable

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
  };

  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: 'Copied!',
          description: `${field} copied to clipboard.`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        toast({
          title: 'Copy failed',
          description: 'Could not copy to clipboard.',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
      }
    );
  };

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
  };

  // Format date string
  const formatDate = (dateString: string) => {
    if (!dateString) return '';

    try {
      // Check if it's already in MM/DD/YYYY format
      if (dateString.includes('/') && !dateString.includes('T')) {
        return dateString;
      }

      // Parse ISO format
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      }
    } catch (error) {
      console.log('Error formatting date:', error);
    }
    return dateString;
  };

  // Format date for "client since" display
  const formatClientSince = (dateString: string) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);

      if (!isNaN(date.getTime())) {
        const formattedDate = formatDate(dateString);
        return `Client since ${formattedDate} (${formatDistanceToNow(date, { addSuffix: true })})`;
      } else {
        return `Client since ${formatDate(dateString)}`;
      }
    } catch (error) {
      console.error('Error in formatClientSince:', error);
      return `Client since ${formatDate(dateString)}`;
    }
  };

  // Render save status
  const renderSaveStatus = () => {
    if (!selectedClient) return null;

    const clientSaveStatus = saveStatus[selectedClient._id] || 'idle';
    const lastSaved = getLastSaved(selectedClient._id);

    if (clientSaveStatus === 'saving') {
      return (
        <Flex align="center" mr={2}>
          <Spinner size="xs" mr={1} color="blue.500" />
          <Text fontSize="xs" color="blue.500">
            Saving...
          </Text>
        </Flex>
      );
    } else if (clientSaveStatus === 'saved') {
      return (
        <Flex align="center" mr={2}>
          <FaCheck color="green" style={{ marginRight: '4px' }} />
          <Text fontSize="xs" color="green.500">
            Saved {lastSaved ? formatDistanceToNow(lastSaved, { addSuffix: true }) : ''}
          </Text>
        </Flex>
      );
    } else if (clientSaveStatus === 'error') {
      return (
        <Flex align="center" mr={2}>
          <FaExclamationCircle color="red" style={{ marginRight: '4px' }} />
          <Text fontSize="xs" color="red.500">
            Failed to save
          </Text>
        </Flex>
      );
    }

    return null;
  };

  // File upload handling for documents modal
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedClient) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF files are allowed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 10MB',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setUploadingDoc(true);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', selectedClient._id);

      const response = await axiosInstance.post('documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data) {
        // Refresh documents list
        await fetchPolicyDocuments(selectedClient._id);

        toast({
          title: 'Document uploaded successfully',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error uploading document',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setUploadingDoc(false);
      // Reset the input
      event.target.value = '';
    }
  };

  // Fetch policy documents
  const fetchPolicyDocuments = useCallback(
    async (clientId: string) => {
      if (!clientId) return;

      try {
        setLoadingDocs(true);
        const response = await axiosInstance.get(`/api/documents/client/${clientId}`);

        if (response.data && response.data.documents) {
          // Filter out deleted documents
          const filteredDocuments = response.data.documents.filter(
            (doc: PolicyDocument) => !deletedDocumentIds.includes(doc._id)
          );

          setPolicyDocuments(filteredDocuments);
        }
      } catch (error) {
        console.error('Error fetching policy documents:', error);
        setPolicyDocuments([]);
      } finally {
        setLoadingDocs(false);
      }
    },
    [deletedDocumentIds]
  );

  // Open documents modal
  const handleOpenDocuments = (client: Client) => {
    setSelectedClient(client);
    fetchPolicyDocuments(client._id);
    onDocsOpen();
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId: string) => {
    if (!documentId || !window.confirm('Are you sure you want to delete this document?')) return;

    try {
      setDeletingDocIds((prev) => new Set(prev).add(documentId));

      await axiosInstance.delete(`/api/documents/${documentId}`);

      // Update local state
      setPolicyDocuments((prev) => prev.filter((doc) => doc._id !== documentId));

      // Add to deleted IDs
      const newDeletedIds = [...deletedDocumentIds, documentId];
      setDeletedDocumentIds(newDeletedIds);
      localStorage.setItem(DELETED_DOCS_STORAGE_KEY, JSON.stringify(newDeletedIds));

      toast({
        title: 'Document deleted',
        description: 'Policy document has been deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Deletion failed',
        description: 'Could not delete the document.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeletingDocIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Remove client by setting disposition to ""
  const handleRemoveClient = async (clientId: string) => {
    try {
      // Optimistically remove from UI
      setClients((prev) => prev.filter((c) => c._id !== clientId));
      setFilteredClients((prev) => prev.filter((c) => c._id !== clientId));

      await axiosInstance.patch(`/api/leads/${clientId}`, { disposition: '' });
    } catch (err) {
      console.error('Failed to remove client', err);
      toast({ title: 'Error', description: 'Could not update disposition', status: 'error', duration: 3000 });
      // Re-fetch to restore consistency
      refreshClients();
    }
  };

  // Periodic refresh every 30s to keep in sync with disposition changes
  // Use stable reference to prevent interval recreation
  const refreshClientsRef = useRef(refreshClients);
  useEffect(() => {
    refreshClientsRef.current = refreshClients;
  }, [refreshClients]);

  useEffect(() => {
    const id = setInterval(() => {
      refreshClientsRef.current();
    }, 30000);
    return () => clearInterval(id);
  }, []); // Empty dependency array to prevent interval recreation

  return (
    <Box bg={bgColor} minHeight="100vh">
      <Container maxW="container.xl" py={6}>
        {/* Header */}
        <Flex mb={6} justify="space-between" align="center" wrap="wrap" gap={4}>
          <Flex align="center">
            <FaUserTie size="28px" color="#FF8C00" style={{ marginRight: '12px' }} />
            <Heading size="lg" color={textColor}>
              Client Management
            </Heading>
            <Badge ml={3} colorScheme="orange" fontSize="md">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
            </Badge>
          </Flex>

          <HStack spacing={4}>
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              width="300px"
              bg="white"
              borderColor={borderColor}
              _focus={{ borderColor: highlightColor }}
            />
            <Button
              colorScheme="orange"
              onClick={refreshClients}
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {/* Loading State */}
        {isLoading && (
          <Flex justify="center" align="center" height="50vh">
            <Spinner size="xl" color={highlightColor} thickness="4px" />
          </Flex>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Selected Client Details */}
        {selectedClient && !isLoading && (
          <Card mb={6} boxShadow="xl" borderWidth="1px" borderColor={borderColor} bg={cardBg}>
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Heading size="md" color={textColor}>
                  Client Details
                </Heading>
                <IconButton
                  aria-label="Close details"
                  size="sm"
                  variant="ghost"
                  colorScheme="gray"
                  borderRadius="full"
                  width="18px"
                  height="18px"
                  minWidth="18px"
                  _hover={{ bg: 'red.600' }}
                  onClick={() => setSelectedClient(null)}
                  icon={<Text fontSize="xs">✕</Text>}
                />
              </Flex>
            </CardHeader>
            <CardBody>
              <Grid templateColumns={['1fr', '1fr', '1fr 1fr', '1fr 2fr']} gap={6}>
                {/* Left Column - Basic Info */}
                <GridItem>
                  <VStack
                    align="start"
                    spacing={4}
                    bg="gray.50"
                    p={4}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                  >
                    <Flex justify="center" align="center" width="100%" direction="column">
                      <Avatar size="xl" name={selectedClient.name} bg={highlightColor} mb={2} />
                      <Heading size="md" textAlign="center">
                        {selectedClient.name}
                      </Heading>
                      <Text color="gray.500" fontSize="sm">
                        {formatClientSince(selectedClient.createdAt)}
                      </Text>
                    </Flex>

                    <Divider />

                    {/* Contact Information */}
                    <Box width="100%">
                      <Text fontWeight="bold" mb={2}>
                        Contact Information
                      </Text>

                      <HStack mb={2}>
                        <FaPhone color="gray" />
                        <Text
                          cursor="pointer"
                          onClick={() =>
                            handleCopyToClipboard(selectedClient.phone ?? '', 'Phone number')
                          }
                          _hover={{ color: highlightColor }}
                        >
                          {formatPhoneNumber(selectedClient.phone ?? '')}
                        </Text>
                        <FaCopy
                          size="14px"
                          color="gray"
                          cursor="pointer"
                          onClick={() =>
                            handleCopyToClipboard(selectedClient.phone ?? '', 'Phone number')
                          }
                        />
                      </HStack>

                      <HStack mb={2}>
                        <FaEnvelope color="gray" />
                        <Text
                          cursor="pointer"
                          onClick={() => handleCopyToClipboard(selectedClient.email ?? '', 'Email')}
                          _hover={{ color: highlightColor }}
                          isTruncated
                          maxWidth="200px"
                        >
                          {selectedClient.email ?? ''}
                        </Text>
                        <FaCopy
                          size="14px"
                          color="gray"
                          cursor="pointer"
                          onClick={() => handleCopyToClipboard(selectedClient.email ?? '', 'Email')}
                        />
                      </HStack>

                      <HStack mb={2}>
                        <FaMapMarkerAlt color="gray" />
                        <Text>
                          {selectedClient.city}, {selectedClient.state} {selectedClient.zipcode}
                        </Text>
                      </HStack>
                    </Box>

                    {/* Personal Information */}
                    <Box width="100%">
                      <Text fontWeight="bold" mb={2}>
                        Personal Information
                      </Text>

                      <HStack mb={2}>
                        <FaCalendarAlt color="gray" />
                        <Text>DOB: {formatDate(selectedClient.dob ?? '')}</Text>
                      </HStack>

                      <HStack width="100%" justify="space-between">
                        <Text>Height: {selectedClient.height || 'N/A'}</Text>
                        <Text>Weight: {selectedClient.weight || 'N/A'}</Text>
                        <Text>Gender: {selectedClient.gender || 'N/A'}</Text>
                      </HStack>
                    </Box>
                  </VStack>
                </GridItem>

                {/* Right Column - Notes */}
                <GridItem>
                  <VStack spacing={4} align="stretch">
                    {/* Notes Section */}
                    <Box
                      p={4}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                      bg="white"
                      position="relative"
                    >
                      <Flex justify="space-between" align="center" mb={3}>
                        <Heading size="sm" display="flex" alignItems="center">
                          <FaFileAlt style={{ marginRight: '8px' }} />
                          Client Notes
                        </Heading>

                        <Flex align="center">
                          {renderSaveStatus()}
                          {!editingNotes && (
                            <Tooltip label="Edit notes">
                              <IconButton
                                aria-label="Edit notes"
                                icon={<FaEdit />}
                                size="sm"
                                variant="ghost"
                                colorScheme="gray"
                                ml={2}
                                onClick={() => setEditingNotes(true)}
                              />
                            </Tooltip>
                          )}
                        </Flex>
                      </Flex>
                      <Divider mb={3} />

                      {!editingNotes ? (
                        <Box
                          minHeight="200px"
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                          whiteSpace="pre-wrap"
                          overflowY="auto"
                          maxHeight="400px"
                          onClick={() => setEditingNotes(true)}
                          cursor="pointer"
                          _hover={{ bg: 'gray.100' }}
                        >
                          {getClientNotes(selectedClient._id) ||
                            'No notes available. Click to add notes.'}
                        </Box>
                      ) : (
                        <NotesEditor
                          leadId={selectedClient._id}
                          initialNotes={getClientNotes(selectedClient._id) || ''}
                          style={{ minHeight: '200px' }}
                        />
                      )}
                    </Box>

                    {/* Action Buttons */}
                    <Flex gap={4} wrap="wrap" justify="flex-start">
                      <Button
                        leftIcon={<FaPhone />}
                        colorScheme="green"
                        color="white"
                        onClick={() => {
                          const cleanPhone = (selectedClient.phone ?? '').replace(/\D/g, '');
                          if (selectedClient._id) {
                            increment(selectedClient._id!);
                          }
                          dialPhone(cleanPhone);
                        }}
                        maxWidth="160px"
                        width="auto"
                      >
                        Call Client
                      </Button>
                      <Button
                        leftIcon={<FaEnvelope />}
                        colorScheme="orange"
                        variant="outline"
                        color={textColor}
                        onClick={() => {
                          window.location.href = `mailto:${selectedClient.email ?? ''}`;
                        }}
                        maxWidth="160px"
                        width="auto"
                      >
                        Email Client
                      </Button>
                      <Button
                        leftIcon={<FaFilePdf />}
                        colorScheme="orange"
                        variant="ghost"
                        color={textColor}
                        onClick={() => handleOpenDocuments(selectedClient)}
                        maxWidth="160px"
                        width="auto"
                      >
                        Documents
                      </Button>
                      <Button
                        leftIcon={<FaClipboardList />}
                        colorScheme="orange"
                        variant="ghost"
                        color={textColor}
                        onClick={() => {
                          navigate(`/leads?disposition=SOLD&search=${selectedClient.name}`);
                        }}
                        maxWidth="160px"
                        width="auto"
                      >
                        View in Leads
                      </Button>
                    </Flex>
                  </VStack>
                </GridItem>
              </Grid>
            </CardBody>
          </Card>
        )}

        {/* Clients Grid */}
        {!isLoading && !error && (
          <>
            {filteredClients.length === 0 ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                height="40vh"
                bg={cardBg}
                p={10}
                borderRadius="lg"
                boxShadow="md"
              >
                <FaUserTie size="48px" color="#FF8C00" />
                <Text mt={4} fontSize="xl" color="gray.500">
                  No clients found
                </Text>
                <Text color="gray.400" mt={2}>
                  {searchQuery
                    ? 'Try adjusting your search'
                    : "Convert leads to clients by setting their disposition to 'SOLD'"}
                </Text>
              </Flex>
            ) : (
              <Grid templateColumns={['1fr', '1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)']} gap={6}>
                {filteredClients.map((client) => (
                  <Card
                    key={client._id}
                    borderWidth="1px"
                    borderColor={borderColor}
                    borderRadius="lg"
                    overflow="hidden"
                    boxShadow="md"
                    transition="all 0.3s"
                    _hover={{
                      transform: 'translateY(-5px)',
                      boxShadow: 'xl',
                    }}
                    bg={cardBg}
                  >
                    <CardHeader pb={0}>
                      <Flex justify="space-between" align="flex-start">
                        <Flex direction="column">
                          <Heading size="md" color={textColor}>
                            {client.name}
                          </Heading>
                          <Text color={secondaryTextColor} fontSize="sm">
                            {formatClientSince(client.createdAt)}
                          </Text>
                        </Flex>
                        <Avatar name={client.name} bg={highlightColor} size="md" />
                      </Flex>
                    </CardHeader>

                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <HStack>
                          <FaPhone color="gray" size="14px" />
                          <Text>{formatPhoneNumber(client.phone ?? '')}</Text>
                        </HStack>

                        <HStack>
                          <FaEnvelope color="gray" size="14px" />
                          <Text isTruncated maxW="200px">
                            {client.email ?? ''}
                          </Text>
                        </HStack>

                        <HStack>
                          <FaMapMarkerAlt color="gray" size="14px" />
                          <Text>{client.state}</Text>
                        </HStack>
                      </VStack>

                      {/* Notes Preview */}
                      {getClientNotes(client._id) && (
                        <Box mt={4}>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            Notes:
                          </Text>
                          <Text fontSize="sm" color={secondaryTextColor} noOfLines={2}>
                            {getClientNotes(client._id)}
                          </Text>
                        </Box>
                      )}
                    </CardBody>

                    <CardFooter pt={0}>
                      <Button
                        onClick={() => handleViewDetails(client)}
                        colorScheme="orange"
                        color="white"
                        size="sm"
                        width="full"
                      >
                        View Details
                      </Button>
                      <IconButton
                        aria-label="Remove client"
                        icon={<FaTrash />}
                        size="sm"
                        variant="ghost"
                        position="absolute"
                        bottom="2"
                        right="2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveClient(client._id);
                        }}
                      />
                    </CardFooter>
                  </Card>
                ))}
              </Grid>
            )}
          </>
        )}
      </Container>

      {/* Documents Modal */}
      <Modal isOpen={isDocsOpen} onClose={onDocsClose} size="xl" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent maxW="800px">
          <ModalHeader>
            <HStack justify="space-between">
              <Text>Documents for {selectedClient?.name}</Text>
              <Badge colorScheme="blue" fontSize="lg">
                {policyDocuments.length} {policyDocuments.length === 1 ? 'Document' : 'Documents'}
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Upload Section */}
              <Box
                p={4}
                borderWidth="2px"
                borderStyle="dashed"
                borderColor={borderColor}
                rounded="md"
                bg={useColorModeValue('gray.50', 'gray.900')}
              >
                <VStack spacing={3}>
                  <FaUpload size={24} color="#FF8C00" />
                  <Text fontWeight="medium">
                    {uploadingDoc ? 'Uploading...' : 'Click to upload PDF document'}
                  </Text>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={uploadingDoc}
                    display="none"
                    id="doc-upload"
                  />
                  <Button
                    as="label"
                    htmlFor="doc-upload"
                    colorScheme="orange"
                    size="sm"
                    isLoading={uploadingDoc}
                    cursor="pointer"
                  >
                    Select File
                  </Button>
                </VStack>
              </Box>

              {/* Documents List */}
              {loadingDocs ? (
                <Flex justify="center" py={8}>
                  <Spinner size="lg" color="blue.500" />
                </Flex>
              ) : policyDocuments.length === 0 ? (
                <Box
                  p={8}
                  textAlign="center"
                  borderWidth="1px"
                  borderColor={borderColor}
                  rounded="md"
                >
                  <Text color={textColor}>No documents uploaded yet</Text>
                </Box>
              ) : (
                <VStack spacing={2} align="stretch">
                  {policyDocuments.map((doc) => (
                    <Box
                      key={doc._id}
                      p={4}
                      borderWidth="1px"
                      borderColor={borderColor}
                      rounded="md"
                      bg={bgColor}
                      _hover={{ shadow: 'md' }}
                    >
                      <Flex justify="space-between" align="center">
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">{doc.fileName}</Text>
                          <HStack spacing={4}>
                            <Text fontSize="sm" color={textColor}>
                              {formatFileSize(doc.fileSize)}
                            </Text>
                            <Text fontSize="sm" color={textColor}>
                              {formatDate(doc.uploadDate)}
                            </Text>
                          </HStack>
                        </VStack>

                        <HStack spacing={2}>
                          <Tooltip label="Download" placement="top">
                            <IconButton
                              aria-label="Download document"
                              icon={<FaDownload />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() =>
                                window.open(`http://localhost:3001${doc.fileUrl}`, '_blank')
                              }
                            />
                          </Tooltip>
                          <Tooltip label="Delete" placement="top">
                            <IconButton
                              aria-label="Delete document"
                              icon={<FaTrash />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleDeleteDocument(doc._id)}
                              isLoading={deletingDocIds.has(doc._id)}
                            />
                          </Tooltip>
                        </HStack>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onDocsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Clients;
