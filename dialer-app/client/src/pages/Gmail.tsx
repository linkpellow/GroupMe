import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Select,
  Stack,
  Badge,
  VStack,
  HStack,
  Divider,
  useToast,
  IconButton,
  Card,
  CardBody,
  CardHeader,
  Tooltip,
  Image,
  useColorModeValue,
  Tag,
  TagLabel,
  List,
  ListItem,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Progress,
  Checkbox,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import {
  FaSync,
  FaEnvelope,
  FaTrash,
  FaReply,
  FaExternalLinkAlt,
  FaPaperPlane,
  FaUnlink,
  FaLink,
  FaInbox,
  FaPaperclip,
  FaStar,
  FaArrowLeft,
  FaCheck,
  FaExchangeAlt,
  FaSearch,
  FaUserAlt,
  FaTimes,
  FaSave,
  FaEdit,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaPlayCircle,
  FaPauseCircle,
  FaArrowUp,
  FaArrowDown,
  FaPlus,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { Lead } from '../types';

// Email interface
interface Email {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  unread: boolean;
}

// Labels interface
interface Label {
  id: string;
  name: string;
  type: string;
}

// Template interface
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  description?: string;
}

// Clean up the EmailRecipientFieldProps interface
interface EmailRecipientFieldProps {
  value: string;
  onChange: (value: string) => void;
  leads: Lead[];
  isLoading: boolean;
  colorMode: any;
  onSelectLead?: (lead: Lead) => void;
  toast: any; // Use toast directly, not useToast
}

// EmailRecipientField component with fixed toast handling
const EmailRecipientField: React.FC<EmailRecipientFieldProps> = ({
  value,
  onChange,
  leads,
  isLoading,
  colorMode,
  onSelectLead,
  toast,
}) => {
  // Local state
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState('');
  const fieldRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update local input value when parent value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter leads based on search text
  const filteredLeads = leads.filter((lead) => {
    const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
    const search = searchText.toLowerCase();
    return (
      lead.email.toLowerCase().includes(search) ||
      fullName.toLowerCase().includes(search) ||
      (lead.name && lead.name.toLowerCase().includes(search))
    );
  });

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchText(newValue);
    onChange(newValue);

    // Show dropdown if typing
    if (newValue && !showDropdown) {
      setShowDropdown(true);
    }
  };

  // Handle selecting a lead from the dropdown
  const handleSelectLead = (lead: Lead) => {
    console.log('Lead selected in component:', lead.email);

    // Add email to existing ones, with proper comma separation
    let newValue = inputValue;

    // Check if the email is already in the list to avoid duplicates
    if (!newValue.includes(lead.email)) {
      // Add comma separator if there's already content
      if (newValue && !newValue.endsWith(', ')) {
        // Check if we need to add a comma+space or just a space
        newValue = newValue.endsWith(',') ? newValue + ' ' : newValue + ', ';
      }

      // Add the new email
      newValue = newValue + lead.email;

      setInputValue(newValue);
      onChange(newValue);

      // Don't close dropdown so user can keep selecting
      // setShowDropdown(false);

      if (onSelectLead) {
        onSelectLead(lead);
      }

      // Show confirmation
      toast({
        title: 'Lead Added',
        description: `Added ${lead.firstName || lead.name} to recipients`,
        status: 'success',
        duration: 1000,
        isClosable: true,
      });
    } else {
      // Notify if email already exists
      toast({
        title: 'Already Added',
        description: `${lead.email} is already in the recipient list`,
        status: 'info',
        duration: 1000,
        isClosable: true,
      });
    }
  };

  // Handle selecting all filtered leads
  const handleSelectAll = () => {
    if (filteredLeads.length === 0) return;

    const allEmails = filteredLeads.map((lead) => lead.email).join(', ');
    setInputValue(allEmails);
    onChange(allEmails);
    setShowDropdown(false);
  };

  // Colors based on color mode
  const cardBg = colorMode === 'dark' ? 'gray.800' : 'white';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';
  const hoverBg = colorMode === 'dark' ? 'gray.700' : 'gray.50';

  return (
    <Box position="relative" ref={fieldRef}>
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <FaUserAlt color="gray.300" />
        </InputLeftElement>
        <Input
          placeholder="Select a lead or type an email address"
          value={inputValue}
          onChange={handleInputChange}
          onClick={() => setShowDropdown(true)}
          borderColor={borderColor}
          size="md"
          _focus={{
            borderColor: 'orange.300',
            boxShadow: '0 0 0 1px orange.300',
          }}
        />
        {inputValue && (
          <InputRightElement>
            <IconButton
              aria-label="Clear input"
              icon={<FaTimes />}
              size="sm"
              variant="ghost"
              onClick={() => {
                setInputValue('');
                onChange('');
                setSearchText('');
                setShowDropdown(false);
              }}
            />
          </InputRightElement>
        )}
      </InputGroup>

      {showDropdown && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={10}
          borderWidth={1}
          borderColor={borderColor}
          borderRadius="md"
          bg={cardBg}
          boxShadow="md"
          maxH="200px"
          overflowY="auto"
          mt={1}
        >
          {isLoading ? (
            <Flex justify="center" align="center" p={4}>
              <Spinner size="sm" color="orange.500" />
            </Flex>
          ) : filteredLeads.length > 0 ? (
            <List spacing={0}>
              <ListItem
                p={2}
                cursor="pointer"
                _hover={{ bg: hoverBg }}
                onClick={handleSelectAll}
                fontWeight="bold"
                borderBottom="1px solid"
                borderColor={borderColor}
                bg={colorMode === 'dark' ? 'gray.700' : 'orange.50'}
              >
                <Flex justify="space-between" align="center">
                  <Text>Select All Leads</Text>
                  <Badge colorScheme="orange" borderRadius="full">
                    {filteredLeads.length}
                  </Badge>
                </Flex>
              </ListItem>

              {filteredLeads.map((lead) => (
                <ListItem
                  key={lead._id}
                  p={2}
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  onClick={() => handleSelectLead(lead)}
                >
                  <Text fontWeight="medium">
                    {lead.firstName && lead.lastName
                      ? `${lead.firstName} ${lead.lastName}`
                      : lead.name}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {lead.email}
                  </Text>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box p={2} textAlign="center">
              <Text color="gray.500">No matching leads found</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// Update Campaign interface to support multi-step sequences
interface CampaignStep {
  id: string;
  templateId: string;
  delayDays: number; // Days after campaign start or previous step
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string; // When this step was actually sent
}

interface Campaign {
  id: string;
  name: string;
  steps: CampaignStep[];
  startDate: string; // ISO date string for when the sequence begins
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'draft';
  recipientIds: string[]; // Array of lead IDs
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
}

const Gmail: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = 'orange.500';
  const colorMode = useColorModeValue('light', 'dark');

  // Add tab index state
  const [tabIndex, setTabIndex] = useState<number>(0);

  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  // Emails state
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('INBOX');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Compose state
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | null>(null);
  const [to, setTo] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    // Try to load templates from localStorage first
    const savedTemplates = localStorage.getItem('emailTemplates');
    if (savedTemplates) {
      try {
        return JSON.parse(savedTemplates);
      } catch (e) {
        console.error('Error parsing saved templates', e);
      }
    }

    // Default templates if none are saved
    return [
      {
        id: '1',
        name: 'Welcome Email',
        subject: 'Welcome to Crokodial!',
        description: 'Sends a welcome message to new leads',
        body: `<p>Hello <name>,</p>
        
        <p>I wanted to personally thank you for your interest in our services. We at Crokodial are excited to work with you and help you find the perfect insurance solution tailored to your needs.</p>
        
        <p>In the coming days, I'll reach out to discuss your specific requirements and answer any questions you may have. Feel free to contact me directly if you need immediate assistance.</p>
        
        <p>Best regards,<br>
        ${user?.name || 'Your Agent'}<br>
        Crokodial Insurance Services</p>`,
      },
      {
        id: '2',
        name: 'Follow-up Email',
        subject: 'Following up on our conversation',
        description: 'Send after initial contact with lead',
        body: `<p>Hello <name>,</p>
        
        <p>I hope this email finds you well. I'm following up on our recent conversation about your insurance needs. I've put together some options that I believe would be a great fit for your situation.</p>
        
        <p>Would you have some time this week to discuss these options in more detail? I'm available for a call or meeting at your convenience.</p>
        
        <p>Looking forward to hearing from you!</p>
        
        <p>Best regards,<br>
        ${user?.name || 'Your Agent'}<br>
        Crokodial Insurance Services</p>`,
      },
      {
        id: '3',
        name: 'Quote Details',
        subject: 'Your Insurance Quote Information',
        description: 'Send when providing a quote to a lead',
        body: `<p>Hello <name>,</p>
        
        <p>As discussed, I'm pleased to provide you with the insurance quote we talked about. Based on the information you've shared, here are the details:</p>
        
        <p><strong>Plan Type:</strong> [Plan Type]<br>
        <strong>Coverage:</strong> [Coverage Details]<br>
        <strong>Monthly Premium:</strong> [Premium Amount]<br>
        <strong>Deductible:</strong> [Deductible Amount]</p>
        
        <p>This quote is valid for the next 30 days. If you'd like to proceed or have any questions, please don't hesitate to reach out.</p>
        
        <p>Best regards,<br>
        ${user?.name || 'Your Agent'}<br>
        Crokodial Insurance Services</p>`,
      },
    ];
  });
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateSubject, setNewTemplateSubject] = useState<string>('');
  const [newTemplateBody, setNewTemplateBody] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<boolean>(false);

  // Leads state for dropdown
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState<boolean>(false);
  const [searchLeads, setSearchLeads] = useState<string>('');
  const [showLeadsDropdown, setShowLeadsDropdown] = useState<boolean>(false);

  // Add state for selected lead when applying template
  const [selectedLeadForTemplate, setSelectedLeadForTemplate] = useState<Lead | null>(null);

  // Add useRef for direct access to input element
  const toInputRef = useRef<HTMLInputElement>(null);

  // Add state for tracking email sending progress
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailProgress, setEmailProgress] = useState(0);
  const [totalEmailsToSend, setTotalEmailsToSend] = useState(0);
  const [sentEmailsCount, setSentEmailsCount] = useState(0);

  // Modal for showing progress
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Add state to track currently editing template
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Add campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    // Try to load campaigns from localStorage
    const savedCampaigns = localStorage.getItem('emailCampaigns');
    if (savedCampaigns) {
      try {
        return JSON.parse(savedCampaigns);
      } catch (e) {
        console.error('Error parsing saved campaigns', e);
      }
    }
    return [];
  });

  // Campaign form state
  const [newCampaignName, setNewCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<string>('all');

  // Add step management state
  const [campaignSteps, setCampaignSteps] = useState<CampaignStep[]>([]);
  const [currentStepTemplateId, setCurrentStepTemplateId] = useState('');
  const [currentStepDelayDays, setCurrentStepDelayDays] = useState(0);
  const [campaignStartDate, setCampaignStartDate] = useState('');

  // Add state for selected emails
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  // Add state for processing a single marketplace lead
  const [processingSingleLead, setProcessingSingleLead] = useState<boolean>(false);

  // Fetch leads data for dropdown
  const fetchLeads = async () => {
    try {
      setLeadsLoading(true);
      const response = await axiosInstance.get('/api/leads', {
        params: {
          getAllResults: true, // Get ALL leads without pagination
        },
      });
      setLeads(response.data.leads);
      console.log(`Loaded ${response.data.leads.length} leads for email selection`);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch leads for email selection',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLeadsLoading(false);
    }
  };

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const connected = params.get('connected') === 'true';
    const error = params.get('error');

    if (connected) {
      toast({
        title: 'Gmail Connected',
        description: 'Your Gmail account has been successfully connected',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Remove query params
      navigate('/gmail', { replace: true });

      // Refresh connection status
      checkConnectionStatus();
    } else if (error) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect your Gmail account',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      // Remove query params
      navigate('/gmail', { replace: true });
    } else {
      // Check connection status
      checkConnectionStatus();
    }
  }, [location.search, navigate, toast]);

  // Load leads when composing or on Campaigns tab
  useEffect(() => {
    if (composeMode === 'new' || composeMode === 'reply') {
      fetchLeads();
    }
  }, [composeMode]);

  // Add a new useEffect to fetch leads when tab changes to Campaigns
  useEffect(() => {
    if (tabIndex === 3) {
      // Campaigns tab
      console.log('Campaigns tab selected, fetching leads');
      fetchLeads();
    }
  }, [tabIndex]);

  // Check Gmail connection status
  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/gmail/status');

      setIsConnected(response.data.connected);
      setConnectedEmail(response.data.email);

      if (response.data.connected) {
        // Load labels and messages
        fetchLabels();
        fetchEmails();
      }
    } catch (error) {
      console.error('Error checking Gmail connection status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check Gmail connection status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Connect Gmail
  const connectGmail = async () => {
    try {
      const response = await axiosInstance.get('/api/gmail/auth-url');

      // Open the auth URL in a new tab
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error generating auth URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to start Gmail connection process',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Disconnect Gmail
  const disconnectGmail = async () => {
    try {
      await axiosInstance.post('/api/gmail/disconnect');

      setIsConnected(false);
      setConnectedEmail(null);
      setEmails([]);
      setSelectedEmail(null);
      setLabels([]);

      toast({
        title: 'Gmail Disconnected',
        description: 'Your Gmail account has been disconnected',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect Gmail account',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Fetch Gmail labels
  const fetchLabels = async () => {
    try {
      const response = await axiosInstance.get('/api/gmail/labels');
      setLabels(response.data.labels || []);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  };

  // Fetch emails
  const fetchEmails = async (pageToken?: string) => {
    try {
      setLoadingMessages(true);

      const response = await axiosInstance.get('/api/gmail/messages', {
        params: {
          labelIds: selectedLabel,
          maxResults: 20,
          pageToken,
        },
      });

      if (pageToken) {
        // Append to existing emails
        setEmails((prev) => [...prev, ...response.data.messages]);
      } else {
        // Replace existing emails
        setEmails(response.data.messages);
      }

      setNextPageToken(response.data.nextPageToken);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch emails',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load more emails
  const loadMoreEmails = () => {
    if (nextPageToken) {
      fetchEmails(nextPageToken);
    }
  };

  // Fetch email details
  const fetchEmailDetails = async (emailId: string) => {
    try {
      setSelectedEmail({ loading: true });

      const response = await axiosInstance.get(`/api/gmail/messages/${emailId}`);
      setSelectedEmail(response.data);
    } catch (error) {
      console.error('Error fetching email details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email details',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setSelectedEmail(null);
    }
  };

  // Decode email body
  const decodeEmailBody = (message: any): string => {
    if (!message || !message.payload) return '';

    // Try to find HTML part first
    const htmlPart = findBodyPart(message.payload, 'text/html');
    if (htmlPart) {
      return decodeBase64Url(htmlPart.body.data || '');
    }

    // Fall back to plain text
    const textPart = findBodyPart(message.payload, 'text/plain');
    if (textPart) {
      return decodeBase64Url(textPart.body.data || '').replace(/\n/g, '<br>');
    }

    return '';
  };

  // Find body part by MIME type
  const findBodyPart = (part: any, mimeType: string): any => {
    if (part.mimeType === mimeType) {
      return part;
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        const found = findBodyPart(subPart, mimeType);
        if (found) return found;
      }
    }

    return null;
  };

  // Decode base64url encoding
  const decodeBase64Url = (data: string): string => {
    try {
      // Convert base64url to base64
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      // Decode
      return decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (error) {
      console.error('Error decoding base64:', error);
      return '';
    }
  };

  // Start composing a new email
  const composeNewEmail = () => {
    setComposeMode('new');
    setTo('');
    setSubject('');
    setBody('');
    setCc('');
    setBcc('');
    setSelectedEmail(null);
    // Switch to the Compose tab (index 1)
    setTabIndex(1);
  };

  // Reply to an email
  const replyToEmail = () => {
    if (!selectedEmail) return;

    // Extract email from from field (format: "Name <email@example.com>")
    const fromMatch =
      selectedEmail.payload.headers.find((h: any) => h.name === 'From')?.value.match(/<(.+)>/) ||
      [];
    const fromEmail =
      fromMatch[1] ||
      selectedEmail.payload.headers.find((h: any) => h.name === 'From')?.value ||
      '';

    setComposeMode('reply');
    setTo(fromEmail);
    setSubject(
      `Re: ${selectedEmail.payload.headers.find((h: any) => h.name === 'Subject')?.value || ''}`
    );
    setBody(`\n\n-------- Original Message --------\n${decodeEmailBody(selectedEmail)}`);
    setCc('');
    setBcc('');
  };

  // Handle selection of a lead from our new component
  const handleLeadSelected = useCallback(
    (lead: Lead) => {
      setSelectedLeadForTemplate(lead);

      toast({
        title: 'Lead Selected',
        description: `Added ${lead.firstName || lead.name} (${lead.email})`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    },
    [toast]
  );

  // Consolidated findLeadByEmail function - single implementation
  const findLeadByEmail = (email: string): Lead | null => {
    if (!email) return null;

    const cleanEmail = email.trim().toLowerCase();
    return leads.find((lead) => lead.email.toLowerCase() === cleanEmail) || null;
  };

  // Parse template for a specific lead - fixed variable naming
  const parseTemplateForLead = (text: string, lead: Lead): string => {
    if (!lead) return text;

    // Define replacements with safe property access
    const replacements: Record<string, string> = {
      '<firstname>': lead.firstName || '',
      '<lastname>': lead.lastName || '',
      '<name>': lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim(), // Consistently use <name>
      '<email>': lead.email || '',
      '<phone>': lead.phone || '',
      '<state>': lead.state || '',
      '<city>': (lead as any).city || '', // Safe access with type assertion
      '<zip>': lead.zipcode || '',
      '<zipcode>': lead.zipcode || '',
      '<dob>': lead.dob || '',
      '<height>': lead.height || '',
      '<weight>': lead.weight || '',
      '<gender>': lead.gender || '',
    };

    // Replace all variables in the text
    let parsedText = text;

    Object.entries(replacements).forEach(([variable, value]) => {
      parsedText = parsedText.replace(new RegExp(variable, 'gi'), value);
    });

    return parsedText;
  };

  // Apply template with proper null checking
  const applyTemplate = (template: EmailTemplate, lead: Lead | null = null) => {
    // If lead is provided, use it. Otherwise, try to use the selected lead or extract lead from 'to' field
    const targetLead = lead || selectedLeadForTemplate || findLeadByEmail(to);

    // Only parse with lead data if we have a valid lead
    let parsedSubject = template.subject;
    let parsedBody = template.body;

    if (targetLead) {
      // Parse template with lead data
      parsedSubject = parseTemplateForLead(template.subject, targetLead);
      parsedBody = parseTemplateForLead(template.body, targetLead);
    }

    setSubject(parsedSubject);
    setBody(parsedBody);

    // Switch to compose tab
    setTabIndex(1);

    toast({
      title: 'Template Applied',
      description: `"${template.name}" template has been applied${targetLead ? ' with lead data' : ''}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Send an email to a single lead
  const sendEmailToLead = async (
    lead: Lead,
    subjectTemplate: string,
    bodyTemplate: string
  ): Promise<boolean> => {
    try {
      // Parse the templates with this lead's data
      const parsedSubject = parseTemplateForLead(subjectTemplate, lead);
      const parsedBody = parseTemplateForLead(bodyTemplate, lead);

      // Send the personalized email
      await axiosInstance.post('/api/gmail/send', {
        to: lead.email,
        subject: parsedSubject,
        body: parsedBody,
        cc,
        bcc,
      });

      return true;
    } catch (error) {
      console.error(`Error sending email to ${lead.email}:`, error);
      return false;
    }
  };

  // Modified send email function for multiple recipients
  const sendEmail = async () => {
    if (!to || !subject || !body) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Extract all email addresses from the To field
    const emailAddresses = to
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email);

    // If no valid emails, show error
    if (emailAddresses.length === 0) {
      toast({
        title: 'No Valid Recipients',
        description: 'Please add at least one valid email address',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // For each email, find the corresponding lead
    const recipientLeads: (Lead | null)[] = emailAddresses.map((email) => findLeadByEmail(email));

    // Count valid leads
    const validLeads = recipientLeads.filter((lead) => lead !== null) as Lead[];

    // Setup progress tracking
    setSendingEmails(true);
    setTotalEmailsToSend(emailAddresses.length);
    setSentEmailsCount(0);
    setEmailProgress(0);
    onOpen(); // Open progress modal

    // Send emails one by one
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emailAddresses.length; i++) {
      const email = emailAddresses[i];
      const lead = recipientLeads[i];

      try {
        if (lead) {
          // If we have lead data, send personalized email
          const success = await sendEmailToLead(lead, subject, body);
          if (success) successCount++;
          else failCount++;
        } else {
          // No lead data, send regular email
          await axiosInstance.post('/api/gmail/send', {
            to: email,
            subject,
            body,
            cc,
            bcc,
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Error sending email to ${email}:`, error);
        failCount++;
      }

      // Update progress
      setSentEmailsCount(i + 1);
      setEmailProgress(Math.round(((i + 1) / emailAddresses.length) * 100));
    }

    // Close progress modal
    setSendingEmails(false);
    onClose();

    // Show final result
    if (successCount > 0 && failCount === 0) {
      toast({
        title: 'Emails Sent',
        description: `Successfully sent ${successCount} individual email${successCount !== 1 ? 's' : ''}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Clear compose mode
      setComposeMode(null);

      // Refresh inbox
      fetchEmails();
    } else if (successCount > 0 && failCount > 0) {
      toast({
        title: 'Partial Success',
        description: `Sent ${successCount} email${successCount !== 1 ? 's' : ''}, but ${failCount} failed`,
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Failed to Send Emails',
        description: 'All emails failed to send. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Cancel composing
  const cancelCompose = () => {
    setComposeMode(null);
  };

  // Handle label change
  const handleLabelChange = (labelId: string) => {
    setSelectedLabel(labelId);
    setSelectedEmail(null);
    fetchEmails();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // Otherwise show full date
    return date.toLocaleDateString();
  };

  // Get icon for label
  const getLabelIcon = (labelId: string) => {
    switch (labelId) {
      case 'INBOX':
        return <FaInbox />;
      case 'SENT':
        return <FaPaperPlane />;
      case 'DRAFT':
        return <FaEnvelope />;
      case 'TRASH':
        return <FaTrash />;
      case 'IMPORTANT':
        return <FaStar />;
      default:
        return <FaEnvelope />;
    }
  };

  // Get formatted label name
  const getLabelName = (name: string = '') => {
    // Convert system labels to proper case
    if (name.toUpperCase() === name && name) {
      return name.charAt(0) + name.slice(1).toLowerCase();
    }
    return name;
  };

  // Modify the saveTemplate function to handle both new and edited templates
  const saveTemplate = () => {
    if (!newTemplateName || !newTemplateSubject || !newTemplateBody) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all template fields',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (editingTemplateId) {
      // Update existing template
      setTemplates((prevTemplates) =>
        prevTemplates.map((template) =>
          template.id === editingTemplateId
            ? {
                ...template,
                name: newTemplateName,
                subject: newTemplateSubject,
                body: newTemplateBody,
              }
            : template
        )
      );

      toast({
        title: 'Template Updated',
        description: `"${newTemplateName}" template has been updated`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      // Create new template
      // Generate a unique ID
      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);

      const newTemplate: EmailTemplate = {
        id: newId,
        name: newTemplateName,
        subject: newTemplateSubject,
        body: newTemplateBody,
        description: 'Custom template',
      };

      // Add the new template to state
      setTemplates((prevTemplates) => [...prevTemplates, newTemplate]);

      toast({
        title: 'Template Saved',
        description: `"${newTemplateName}" template has been saved and will persist between sessions`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }

    // Reset form and editing state
    setNewTemplateName('');
    setNewTemplateSubject('');
    setNewTemplateBody('');
    setEditingTemplateId(null);
    setEditingTemplate(false);
  };

  // Add function to start editing a template
  const startEditingTemplate = (template: EmailTemplate) => {
    setNewTemplateName(template.name);
    setNewTemplateSubject(template.subject);
    setNewTemplateBody(template.body);
    setEditingTemplateId(template.id);
    setEditingTemplate(true);

    // Scroll to the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel editing and clear form
  const cancelEditing = () => {
    setNewTemplateName('');
    setNewTemplateSubject('');
    setNewTemplateBody('');
    setEditingTemplateId(null);
    setEditingTemplate(false);
  };

  // Delete template
  const deleteTemplate = (id: string) => {
    setTemplates((prevTemplates) => prevTemplates.filter((template) => template.id !== id));

    toast({
      title: 'Template Deleted',
      description: 'The template has been removed',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Save the current compose form as a template
  const saveCurrentAsTemplate = () => {
    if (!subject || !body) {
      toast({
        title: 'Missing Content',
        description: 'Please add a subject and body to your email first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setNewTemplateName('');
    setNewTemplateSubject(subject);
    setNewTemplateBody(body);
    setEditingTemplate(true);

    // Switch to templates tab
    setTabIndex(2);
  };

  // Add effect to save templates to localStorage when they change
  useEffect(() => {
    localStorage.setItem('emailTemplates', JSON.stringify(templates));
  }, [templates]);

  // Add useEffect to save campaigns to localStorage
  useEffect(() => {
    localStorage.setItem('emailCampaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  // Reset campaign form
  const resetCampaignForm = () => {
    setNewCampaignName('');
    setCampaignSteps([]);
    setCurrentStepTemplateId('');
    setCurrentStepDelayDays(0);
    setCampaignStartDate('');
    setSelectedRecipients([]);
    setEditingCampaignId(null);
    setCreatingCampaign(false);
  };

  // Add a step to the campaign
  const addCampaignStep = () => {
    if (!currentStepTemplateId) {
      toast({
        title: 'Template Required',
        description: 'Please select a template for this step',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newStep: CampaignStep = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      templateId: currentStepTemplateId,
      delayDays: currentStepDelayDays,
      status: 'pending',
    };

    setCampaignSteps((prev) => [...prev, newStep]);
    setCurrentStepTemplateId('');

    // Fix the delay days increment logic
    const maxDelayDay =
      campaignSteps.length > 0 ? Math.max(...campaignSteps.map((step) => step.delayDays)) : 0;
    setCurrentStepDelayDays(maxDelayDay + 1);

    toast({
      title: 'Step Added',
      description: `Email step added to campaign sequence`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Remove a step from the campaign
  const removeCampaignStep = (stepId: string) => {
    setCampaignSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  // Move a step up or down in the sequence
  const reorderCampaignStep = (stepId: string, direction: 'up' | 'down') => {
    setCampaignSteps((prev) => {
      const index = prev.findIndex((step) => step.id === stepId);
      if (index === -1) return prev;

      if (direction === 'up' && index > 0) {
        const newSteps = [...prev];
        [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
        return newSteps;
      }

      if (direction === 'down' && index < prev.length - 1) {
        const newSteps = [...prev];
        [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
        return newSteps;
      }

      return prev;
    });
  };

  // Update the createCampaign function to handle multi-step sequences
  const createCampaign = () => {
    if (!newCampaignName || !campaignStartDate) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a campaign name and start date',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (campaignSteps.length === 0) {
      toast({
        title: 'No Email Steps',
        description: 'Please add at least one email step to your campaign',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (selectedRecipients.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select at least one recipient for your campaign',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const now = new Date().toISOString();

    if (editingCampaignId) {
      // Update existing campaign
      setCampaigns((prevCampaigns) =>
        prevCampaigns.map((campaign) =>
          campaign.id === editingCampaignId
            ? {
                ...campaign,
                name: newCampaignName,
                steps: campaignSteps,
                startDate: campaignStartDate,
                recipientIds: selectedRecipients,
                recipientCount: selectedRecipients.length,
                updatedAt: now,
              }
            : campaign
        )
      );

      toast({
        title: 'Campaign Updated',
        description: `"${newCampaignName}" campaign has been updated`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      // Create new campaign
      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);

      const newCampaign: Campaign = {
        id: newId,
        name: newCampaignName,
        steps: campaignSteps,
        startDate: campaignStartDate,
        status: 'scheduled',
        recipientIds: selectedRecipients,
        recipientCount: selectedRecipients.length,
        createdAt: now,
        updatedAt: now,
      };

      setCampaigns((prevCampaigns) => [...prevCampaigns, newCampaign]);

      toast({
        title: 'Campaign Created',
        description: `"${newCampaignName}" campaign has been scheduled`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }

    // Reset form
    resetCampaignForm();
  };

  // Start editing a campaign
  const startEditingCampaign = (campaign: Campaign) => {
    setNewCampaignName(campaign.name);
    setCampaignSteps(campaign.steps);
    setCampaignStartDate(campaign.startDate);
    setSelectedRecipients(campaign.recipientIds);
    setEditingCampaignId(campaign.id);
    setCreatingCampaign(true);

    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate the date when a step will be sent
  const calculateStepDate = (startDate: string, delayDays: number): string => {
    if (!startDate) return 'Date not set';

    try {
      const date = new Date(startDate);
      date.setDate(date.getDate() + delayDays);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Toggle campaign status
  const toggleCampaignStatus = (id: string) => {
    setCampaigns((prevCampaigns) =>
      prevCampaigns.map((campaign) =>
        campaign.id === id
          ? {
              ...campaign,
              status: campaign.status === 'paused' ? 'scheduled' : 'paused',
              updatedAt: new Date().toISOString(),
            }
          : campaign
      )
    );
  };

  // Get the template name by ID
  const getTemplateName = (templateId: string): string => {
    const template = templates.find((t) => t.id === templateId);
    return template ? template.name : 'Unknown Template';
  };

  // Format date for display
  const formatCampaignDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle recipient toggle
  const toggleRecipient = (leadId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  // Select all filtered leads
  const selectAllFilteredLeads = () => {
    const filteredLeads = getFilteredLeads();

    if (filteredLeads.length === 0) {
      toast({
        title: 'No Leads Available',
        description: 'There are no leads that match your current filter',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    // Get all lead IDs from the filtered leads
    const allLeadIds = filteredLeads.map((lead) => lead._id);
    setSelectedRecipients(allLeadIds);

    toast({
      title: 'All Leads Selected',
      description: `Added ${allLeadIds.length} leads to the campaign`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Clear all selected recipients
  const clearSelectedRecipients = () => {
    setSelectedRecipients([]);
  };

  // Filter campaigns based on status
  const getFilteredCampaigns = () => {
    if (campaignFilter === 'all') {
      return campaigns;
    }
    return campaigns.filter((campaign) => campaign.status === campaignFilter);
  };

  // Add helper function to filter leads by search text
  const getFilteredLeads = (): Lead[] => {
    // Debug logging
    console.log(`Filtering ${leads.length} leads with search text: "${searchLeads}"`);

    if (!leads.length) {
      console.log('No leads available to filter');
      return [];
    }

    // If no search text, return all leads
    if (!searchLeads || !searchLeads.trim()) {
      console.log('No search text, returning all leads');
      return leads;
    }

    // Filter leads based on search criteria
    const search = searchLeads.toLowerCase().trim();
    const filtered = leads.filter((lead) => {
      // Safely access properties that might be undefined
      const firstName = (lead.firstName || '').toLowerCase();
      const lastName = (lead.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const name = (lead.name || '').toLowerCase();
      const email = (lead.email || '').toLowerCase();

      return (
        email.includes(search) ||
        fullName.includes(search) ||
        name.includes(search) ||
        firstName.includes(search) ||
        lastName.includes(search)
      );
    });

    console.log(`Found ${filtered.length} matching leads`);
    return filtered;
  };

  // Render connection section
  const renderConnectionSection = () => {
    if (loading) {
      return (
        <Flex justify="center" align="center" p={8}>
          <Spinner size="xl" color={accentColor} thickness="4px" speed="0.65s" />
        </Flex>
      );
    }

    if (!isConnected) {
      return (
        <Box p={8} textAlign="center" bg={cardBg} borderRadius="md" boxShadow="md">
          <VStack spacing={8}>
            <Image
              src="https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png"
              alt="Gmail Logo"
              boxSize="80px"
              mb={2}
            />
            <Heading size="lg">Connect your Gmail account</Heading>
            <Text fontSize="lg" maxW="600px">
              Connect your Gmail account to send and receive emails directly from Crokodial. All
              your messages will be available in one place without switching between applications.
            </Text>
            <Button
              leftIcon={<FaLink />}
              colorScheme="red"
              size="lg"
              onClick={connectGmail}
              py={6}
              px={10}
              borderRadius="full"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
              transition="all 0.2s"
            >
              Connect Gmail
            </Button>
          </VStack>
        </Box>
      );
    }

    return (
      <Box p={0}>
        <Flex
          justify="space-between"
          align="center"
          bg={useColorModeValue('orange.50', 'orange.900')}
          p={4}
          borderTopRadius="md"
          borderBottom="1px solid"
          borderColor={borderColor}
        >
          <HStack spacing={4}>
            <Image
              src="https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png"
              alt="Gmail Logo"
              boxSize="30px"
            />
            <Text fontWeight="bold">Connected to:</Text>
            <Badge colorScheme="green" p={2} borderRadius="md" fontSize="sm">
              {connectedEmail}
            </Badge>
            <Button
              colorScheme="orange"
              size="sm"
              onClick={processSingleMarketplaceLead}
              isLoading={processingSingleLead}
              loadingText="Processing"
              title="Process one marketplace lead email"
            >
              Process Lead Email
            </Button>
          </HStack>
          <Button
            leftIcon={<FaExchangeAlt />}
            colorScheme="gray"
            variant="ghost"
            size="sm"
            onClick={disconnectGmail}
          >
            Switch Users
          </Button>
        </Flex>

        <Tabs
          variant="enclosed"
          colorScheme="orange"
          index={tabIndex}
          onChange={(index) => setTabIndex(index)}
        >
          <TabList bg={useColorModeValue('gray.50', 'gray.700')} display="flex" width="100%">
            <Tab
              py={3}
              px={6}
              fontWeight="medium"
              flex="1"
              _selected={{
                color: 'orange.600',
                borderColor: 'orange.200',
                borderBottom: '3px solid',
                borderBottomColor: 'orange.500',
                bg: 'white',
              }}
            >
              <HStack>
                <FaInbox />
                <Text>Inbox</Text>
              </HStack>
            </Tab>
            <Tab
              py={3}
              px={6}
              fontWeight="medium"
              flex="1.5"
              _selected={{
                color: 'orange.600',
                borderColor: 'orange.200',
                borderBottom: '3px solid',
                borderBottomColor: 'orange.500',
                bg: 'white',
              }}
            >
              <HStack justifyContent="center">
                <FaPaperPlane />
                <Text>Compose</Text>
              </HStack>
            </Tab>
            <Tab
              py={3}
              px={6}
              fontWeight="medium"
              flex="1.5"
              _selected={{
                color: 'orange.600',
                borderColor: 'orange.200',
                borderBottom: '3px solid',
                borderBottomColor: 'orange.500',
                bg: 'white',
              }}
            >
              <HStack justifyContent="center">
                <FaEnvelope />
                <Text>Templates</Text>
              </HStack>
            </Tab>
            <Tab
              py={3}
              px={6}
              fontWeight="medium"
              flex="1.5"
              _selected={{
                color: 'orange.600',
                borderColor: 'orange.200',
                borderBottom: '3px solid',
                borderBottomColor: 'orange.500',
                bg: 'white',
              }}
            >
              <HStack justifyContent="center">
                <FaCalendarAlt />
                <Text>Campaigns</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={0}>{renderEmailInterface()}</TabPanel>
            <TabPanel bg={cardBg}>{renderComposeInterface()}</TabPanel>
            <TabPanel bg={cardBg}>{renderTemplatesInterface()}</TabPanel>
            <TabPanel bg={cardBg}>{renderCampaignsInterface()}</TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    );
  };

  // Render email interface
  const renderEmailInterface = () => {
    return (
      <Box>
        <Flex>
          <Box
            w="20%"
            borderRight="1px solid"
            borderColor={borderColor}
            bg={useColorModeValue('gray.50', 'gray.700')}
            p={4}
          >
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">Labels</Heading>
              <IconButton
                aria-label="Refresh labels"
                icon={<FaSync />}
                size="sm"
                variant="ghost"
                colorScheme="orange"
                onClick={fetchLabels}
              />
            </Flex>
            <Stack spacing={1} maxH="calc(100vh - 300px)" overflowY="auto" pr={2}>
              {labels.map((label) => (
                <Button
                  key={label.id}
                  variant={selectedLabel === label.id ? 'solid' : 'ghost'}
                  justifyContent="flex-start"
                  size="sm"
                  colorScheme={selectedLabel === label.id ? 'orange' : 'gray'}
                  leftIcon={getLabelIcon(label.id)}
                  onClick={() => handleLabelChange(label.id)}
                  mb={1}
                  borderRadius="md"
                >
                  {getLabelName(label.name)}
                </Button>
              ))}
            </Stack>
          </Box>

          <Box w="80%" pl={0} bg={cardBg}>
            <Flex
              justify="space-between"
              align="center"
              p={4}
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={useColorModeValue('white', 'gray.800')}
            >
              <Flex align="center">
                {/* Select all checkbox */}
                <Checkbox
                  mr={3}
                  isChecked={emails.length > 0 && selectedEmails.length === emails.length}
                  isIndeterminate={
                    selectedEmails.length > 0 && selectedEmails.length < emails.length
                  }
                  onChange={toggleSelectAll}
                  colorScheme="orange"
                  size="lg"
                />
                <Heading size="md">
                  {getLabelName(labels.find((l) => l.id === selectedLabel)?.name || 'Emails')}
                </Heading>
              </Flex>
              <HStack>
                {/* Show actions when emails are selected */}
                {selectedEmails.length > 0 && (
                  <IconButton
                    aria-label="Delete selected"
                    icon={<FaTrash />}
                    size="sm"
                    colorScheme="red"
                    onClick={deleteSelectedEmails}
                    mr={2}
                  />
                )}
                <IconButton
                  aria-label="Refresh emails"
                  icon={<FaSync />}
                  size="sm"
                  variant="ghost"
                  colorScheme="orange"
                  onClick={() => fetchEmails()}
                  isLoading={loadingMessages}
                />
                <Button
                  leftIcon={<FaEnvelope />}
                  colorScheme="orange"
                  size="sm"
                  onClick={composeNewEmail}
                  variant="solid"
                  minW="100px"
                  px={4}
                >
                  Compose
                </Button>
              </HStack>
            </Flex>

            {selectedEmail ? (
              renderEmailDetail()
            ) : (
              <Box>
                {emails.length === 0 && !loadingMessages ? (
                  <Alert status="info" m={4} borderRadius="md">
                    <AlertIcon />
                    No emails found in this label.
                  </Alert>
                ) : (
                  <VStack spacing={0} align="stretch" maxH="calc(100vh - 300px)" overflowY="auto">
                    {emails.map((email) => (
                      <Box
                        key={email.id}
                        p={4}
                        borderBottom="1px solid"
                        borderColor={borderColor}
                        bg={email.unread ? useColorModeValue('orange.50', 'gray.700') : cardBg}
                        cursor="pointer"
                        _hover={{ bg: hoverBg }}
                        onClick={() => fetchEmailDetails(email.id)}
                        position="relative"
                        role="group"
                      >
                        <Flex justify="space-between" align="center">
                          <Flex align="center">
                            {/* Use a completely different approach with a large area div and direct onClick */}
                            <Box
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Toggle the email selection directly
                                setSelectedEmails((prev) => {
                                  if (prev.includes(email.id)) {
                                    return prev.filter((id) => id !== email.id);
                                  } else {
                                    return [...prev, email.id];
                                  }
                                });
                                return false;
                              }}
                              p={2} // Add padding to increase hit area
                              mr={2}
                              cursor="pointer"
                              borderRadius="md"
                              _hover={{
                                bg: useColorModeValue('gray.100', 'gray.600'),
                              }}
                              zIndex={2} // Ensure it's above other elements
                            >
                              <Checkbox
                                isChecked={selectedEmails.includes(email.id)}
                                colorScheme="orange"
                                size="md"
                                pointerEvents="none" // Make the checkbox non-interactive, let the parent div handle clicks
                              />
                            </Box>
                            <Box
                              onClick={() => fetchEmailDetails(email.id)}
                              flex="1"
                              cursor="pointer"
                            >
                              <Text
                                fontWeight={email.unread ? 'bold' : 'normal'}
                                noOfLines={1}
                                fontSize="sm"
                                color={email.unread ? 'orange.600' : 'gray.600'}
                              >
                                {email.from}
                              </Text>
                            </Box>
                          </Flex>
                          <HStack>
                            {email.unread && (
                              <Badge colorScheme="orange" borderRadius="full" px={2}>
                                New
                              </Badge>
                            )}
                            <Text fontSize="xs" color="gray.500">
                              {formatDate(email.date)}
                            </Text>
                            {/* Add the trash icon - visible only on hover */}
                            <IconButton
                              aria-label="Delete email"
                              icon={<FaTrash />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              display="none"
                              _groupHover={{ display: 'flex' }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent opening the email
                                trashEmail(email.id);
                              }}
                            />
                          </HStack>
                        </Flex>
                        <Text
                          fontWeight={email.unread ? 'bold' : 'medium'}
                          noOfLines={1}
                          mt={1}
                          fontSize="md"
                        >
                          {email.subject || '(No subject)'}
                        </Text>
                        <Text fontSize="sm" color="gray.600" noOfLines={1} mt={1}>
                          {email.snippet}
                        </Text>
                      </Box>
                    ))}

                    {nextPageToken && (
                      <Button
                        onClick={loadMoreEmails}
                        variant="ghost"
                        isLoading={loadingMessages}
                        w="100%"
                        mt={2}
                        colorScheme="orange"
                      >
                        Load More
                      </Button>
                    )}
                  </VStack>
                )}

                {loadingMessages && (
                  <Flex justify="center" my={8}>
                    <Spinner color={accentColor} size="lg" />
                  </Flex>
                )}
              </Box>
            )}
          </Box>
        </Flex>
      </Box>
    );
  };

  // Render email detail
  const renderEmailDetail = () => {
    if (!selectedEmail) return null;

    if (selectedEmail.loading) {
      return (
        <Flex justify="center" align="center" p={8} h="500px">
          <Spinner size="lg" color={accentColor} />
        </Flex>
      );
    }

    const headers = selectedEmail.payload.headers;
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const to = headers.find((h: any) => h.name === 'To')?.value || '';
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    return (
      <Box p={4}>
        <HStack spacing={3} mb={4}>
          <IconButton
            aria-label="Back to emails"
            icon={<FaArrowLeft />}
            onClick={() => setSelectedEmail(null)}
            colorScheme="orange"
            variant="ghost"
          />
          <IconButton
            aria-label="Reply"
            icon={<FaReply />}
            onClick={replyToEmail}
            colorScheme="orange"
          />
          <IconButton
            aria-label="Delete"
            icon={<FaTrash />}
            variant="ghost"
            colorScheme="red"
            onClick={() => {
              // Confirm before deleting
              if (window.confirm('Move this email to trash?')) {
                trashEmail(selectedEmail.id);
                setSelectedEmail(null); // Go back to inbox after deletion
              }
            }}
          />
        </HStack>

        <Card mb={4} variant="outline" boxShadow="sm">
          <CardHeader pb={2} bg={useColorModeValue('orange.50', 'gray.700')} borderTopRadius="md">
            <Heading size="md">{subject || '(No subject)'}</Heading>
          </CardHeader>
          <CardBody pt={3}>
            <VStack align="stretch" spacing={2}>
              <Flex justify="space-between" align="center">
                <HStack>
                  <Text fontWeight="bold">From:</Text>
                  <Text>{from}</Text>
                </HStack>
                <Tag colorScheme="orange" borderRadius="full" size="sm">
                  <TagLabel>{new Date(date).toLocaleString()}</TagLabel>
                </Tag>
              </Flex>
              <HStack>
                <Text fontWeight="bold">To:</Text>
                <Text>{to}</Text>
              </HStack>
              <Divider my={3} />
            </VStack>
            <Box
              mt={4}
              className="email-body"
              p={2}
              borderRadius="md"
              bg={useColorModeValue('white', 'gray.800')}
              dangerouslySetInnerHTML={{
                __html: decodeEmailBody(selectedEmail),
              }}
              overflowX="auto"
              maxH="calc(100vh - 400px)"
              overflowY="auto"
              css={{
                img: {
                  maxWidth: '100%',
                  height: 'auto',
                },
                a: {
                  color: '#DD6B20',
                  textDecoration: 'underline',
                },
                'p, div': {
                  maxWidth: '100%',
                  overflow: 'hidden',
                },
              }}
            />
          </CardBody>
        </Card>
      </Box>
    );
  };

  // Render templates interface
  const renderTemplatesInterface = () => {
    return (
      <Box p={6} bg={cardBg}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="md" color="orange.600">
            Email Templates
          </Heading>
          <Button
            size="sm"
            colorScheme="orange"
            onClick={editingTemplate ? cancelEditing : () => setEditingTemplate(true)}
          >
            {editingTemplate ? 'Cancel' : 'Create New Template'}
          </Button>
        </Flex>

        {editingTemplate ? (
          <Box mb={8} p={4} borderWidth={1} borderRadius="md" borderColor={borderColor}>
            <VStack spacing={4} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="sm" color="orange.600">
                  {editingTemplateId ? 'Edit Template' : 'Create New Template'}
                </Heading>
              </Flex>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Template Name</FormLabel>
                <Input
                  placeholder="e.g., Welcome Email"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  borderColor={borderColor}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Subject Line</FormLabel>
                <Input
                  placeholder="Email subject"
                  value={newTemplateSubject}
                  onChange={(e) => setNewTemplateSubject(e.target.value)}
                  borderColor={borderColor}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Email Body</FormLabel>
                <Box bg={useColorModeValue('gray.50', 'gray.700')} p={3} borderRadius="md" mb={3}>
                  <Text fontSize="sm" fontWeight="medium">
                    Available Template Variables:
                  </Text>
                  <Text fontSize="sm">
                    <Badge mr={1}>&lt;firstname&gt;</Badge>
                    <Badge mr={1}>&lt;lastname&gt;</Badge>
                    <Badge mr={1}>&lt;name&gt;</Badge>
                    <Badge mr={1}>&lt;email&gt;</Badge>
                    <Badge mr={1}>&lt;phone&gt;</Badge>
                  </Text>
                  <Text fontSize="sm" mt={1}>
                    <Badge mr={1}>&lt;state&gt;</Badge>
                    <Badge mr={1}>&lt;city&gt;</Badge>
                    <Badge mr={1}>&lt;zip&gt;</Badge>
                    <Badge mr={1}>&lt;dob&gt;</Badge>
                    <Badge mr={1}>&lt;height&gt;</Badge>
                    <Badge mr={1}>&lt;weight&gt;</Badge>
                    <Badge mr={1}>&lt;gender&gt;</Badge>
                  </Text>
                </Box>
                <Textarea
                  placeholder="Write your template here..."
                  value={newTemplateBody}
                  onChange={(e) => setNewTemplateBody(e.target.value)}
                  minH="150px"
                  borderColor={borderColor}
                />
              </FormControl>

              <HStack spacing={4} justify="flex-end">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button colorScheme="orange" onClick={saveTemplate}>
                  {editingTemplateId ? 'Update Template' : 'Save Template'}
                </Button>
              </HStack>
            </VStack>
          </Box>
        ) : null}

        <VStack spacing={4} align="stretch" maxH="calc(100vh - 350px)" overflowY="auto">
          {templates.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              No templates available. Create your first template to get started.
            </Alert>
          ) : (
            templates.map((template) => (
              <Card key={template.id} variant="outline" mb={2}>
                <CardBody>
                  <Flex justify="space-between" align="start" wrap="wrap" gap={2}>
                    <Box flex="1" minW="200px">
                      <Heading size="sm" mb={2}>
                        {template.name}
                      </Heading>
                      {template.description && (
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          {template.description}
                        </Text>
                      )}
                      <Badge>{template.subject}</Badge>
                    </Box>
                    <HStack spacing={3}>
                      <Button
                        size="sm"
                        colorScheme="orange"
                        onClick={() => applyTemplate(template)}
                        minW="110px"
                        px={4}
                      >
                        Use Template
                      </Button>
                      <IconButton
                        aria-label="Edit template"
                        icon={<FaEdit />}
                        size="sm"
                        variant="ghost"
                        colorScheme="blue"
                        onClick={() => startEditingTemplate(template)}
                      />
                      <IconButton
                        aria-label="Delete template"
                        icon={<FaTrash />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => deleteTemplate(template.id)}
                      />
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>
            ))
          )}
        </VStack>
      </Box>
    );
  };

  // Complete the renderCampaignsInterface function with proper reference to filteredLeads
  const renderCampaignsInterface = () => {
    const filteredCampaigns = getFilteredCampaigns();
    const filteredLeads = getFilteredLeads();

    // Debugging information
    console.log(`Rendering campaigns interface with ${filteredLeads.length} filtered leads`);

    return (
      <Box p={6} bg={cardBg}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="md" color="orange.600">
            Email Campaigns
          </Heading>
          <Button
            size="sm"
            colorScheme="orange"
            leftIcon={<FaCalendarAlt />}
            onClick={() => setCreatingCampaign(!creatingCampaign)}
          >
            {creatingCampaign ? 'Cancel' : 'Create Campaign'}
          </Button>
        </Flex>

        {creatingCampaign ? (
          <Box mb={8} p={4} borderWidth={1} borderRadius="md" borderColor={borderColor}>
            <VStack spacing={4} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="sm" color="orange.600">
                  {editingCampaignId ? 'Edit Campaign' : 'Create New Campaign'}
                </Heading>
              </Flex>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Campaign Name</FormLabel>
                <Input
                  placeholder="e.g., May Health Insurance Follow-up"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  borderColor={borderColor}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="medium">Campaign Start Date</FormLabel>
                <Input
                  type="datetime-local"
                  value={campaignStartDate}
                  onChange={(e) => setCampaignStartDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  borderColor={borderColor}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  This is when your first email will be sent. Subsequent emails will follow based on
                  the delay days.
                </Text>
              </FormControl>

              {/* Email Sequence Steps */}
              <Box>
                <Flex justify="space-between" align="center" mb={2}>
                  <FormLabel fontWeight="medium" mb={0}>
                    Email Sequence ({campaignSteps.length}{' '}
                    {campaignSteps.length === 1 ? 'step' : 'steps'})
                  </FormLabel>
                  {campaignSteps.length > 0 && (
                    <Badge colorScheme="orange" borderRadius="full" px={2}>
                      {campaignSteps.length} day sequence
                    </Badge>
                  )}
                </Flex>

                {/* Existing Steps */}
                {campaignSteps.length > 0 ? (
                  <VStack spacing={3} align="stretch" mb={4} px={1}>
                    {campaignSteps.map((step, index) => {
                      const template = templates.find((t) => t.id === step.templateId);
                      return (
                        <Card key={step.id} variant="outline" size="sm">
                          <CardBody p={3}>
                            <Flex justify="space-between" align="center">
                              <HStack>
                                <Badge colorScheme="blue" borderRadius="full">
                                  Day {step.delayDays}
                                </Badge>
                                <Text fontWeight="medium">
                                  {template?.name || 'Unknown Template'}
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                  {calculateStepDate(campaignStartDate, step.delayDays)}
                                </Text>
                              </HStack>
                              <HStack spacing={1}>
                                <IconButton
                                  aria-label="Move step up"
                                  icon={<FaArrowUp />}
                                  size="xs"
                                  variant="ghost"
                                  isDisabled={index === 0}
                                  onClick={() => reorderCampaignStep(step.id, 'up')}
                                />
                                <IconButton
                                  aria-label="Move step down"
                                  icon={<FaArrowDown />}
                                  size="xs"
                                  variant="ghost"
                                  isDisabled={index === campaignSteps.length - 1}
                                  onClick={() => reorderCampaignStep(step.id, 'down')}
                                />
                                <IconButton
                                  aria-label="Remove step"
                                  icon={<FaTrash />}
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => removeCampaignStep(step.id)}
                                />
                              </HStack>
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                ) : (
                  <Alert status="info" borderRadius="md" mb={4}>
                    <AlertIcon />
                    No email steps added yet. Add your first email below.
                  </Alert>
                )}

                {/* Add New Step Form */}
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  borderColor={borderColor}
                  bg={useColorModeValue('gray.50', 'gray.700')}
                >
                  <VStack spacing={3} align="stretch">
                    <Heading size="xs" color="gray.600">
                      Add Email Step
                    </Heading>

                    <HStack>
                      <FormControl flex="1">
                        <FormLabel fontSize="sm">Template</FormLabel>
                        <Select
                          placeholder="Select a template"
                          value={currentStepTemplateId}
                          onChange={(e) => setCurrentStepTemplateId(e.target.value)}
                          size="sm"
                        >
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl flex="0.5">
                        <FormLabel fontSize="sm">Send on Day</FormLabel>
                        <NumberInput
                          min={0}
                          max={365}
                          value={currentStepDelayDays}
                          onChange={(_, value) => setCurrentStepDelayDays(value)}
                          size="sm"
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                    </HStack>

                    <Button
                      size="sm"
                      colorScheme="orange"
                      variant="solid"
                      leftIcon={<FaPlus />}
                      onClick={addCampaignStep}
                      alignSelf="flex-end"
                    >
                      Add Email Step
                    </Button>
                  </VStack>
                </Box>

                {campaignSteps.length > 0 && (
                  <Box
                    mt={3}
                    p={3}
                    borderRadius="md"
                    bg={useColorModeValue('orange.50', 'orange.900')}
                  >
                    <Heading size="xs" mb={2}>
                      Campaign Timeline
                    </Heading>
                    <VStack spacing={2} align="stretch">
                      {campaignSteps.map((step, index) => {
                        const template = templates.find((t) => t.id === step.templateId);
                        const date = calculateStepDate(campaignStartDate, step.delayDays);
                        return (
                          <Flex key={step.id} justify="space-between">
                            <Text fontSize="sm">
                              <strong>Day {step.delayDays}:</strong>{' '}
                              {template?.name || 'Unknown Template'}
                            </Text>
                            <Text fontSize="sm">{date}</Text>
                          </Flex>
                        );
                      })}
                    </VStack>
                  </Box>
                )}
              </Box>

              <FormControl>
                <FormLabel fontWeight="medium">
                  Recipients ({selectedRecipients.length} selected)
                </FormLabel>
                <HStack mb={2}>
                  <Button
                    size="sm"
                    colorScheme="orange"
                    variant="outline"
                    leftIcon={<FaUsers />}
                    onClick={selectAllFilteredLeads}
                    isDisabled={leads.length === 0 || leadsLoading}
                  >
                    Select All {filteredLeads.length > 0 ? `(${filteredLeads.length})` : ''}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSelectedRecipients}
                    isDisabled={selectedRecipients.length === 0}
                  >
                    Clear Selection
                  </Button>
                </HStack>

                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FaSearch color="gray.300" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search leads by name or email..."
                    value={searchLeads}
                    onChange={(e) => {
                      setSearchLeads(e.target.value);
                      console.log(`Search updated to: ${e.target.value}`);
                    }}
                    mb={4}
                    borderColor={borderColor}
                  />
                  {searchLeads && (
                    <InputRightElement>
                      <IconButton
                        aria-label="Clear search"
                        icon={<FaTimes />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setSearchLeads('')}
                      />
                    </InputRightElement>
                  )}
                </InputGroup>

                <Box
                  maxH="200px"
                  overflowY="auto"
                  borderWidth={1}
                  borderRadius="md"
                  borderColor={borderColor}
                  p={2}
                >
                  {leadsLoading ? (
                    <Flex justify="center" p={4}>
                      <Spinner size="sm" />
                    </Flex>
                  ) : leads.length === 0 ? (
                    <Text textAlign="center" p={4} color="gray.500">
                      No leads loaded. Please wait while we load your leads.
                    </Text>
                  ) : filteredLeads.length > 0 ? (
                    <VStack align="stretch" spacing={1}>
                      {filteredLeads.map((lead: Lead) => (
                        <Checkbox
                          key={lead._id}
                          isChecked={selectedRecipients.includes(lead._id)}
                          onChange={() => toggleRecipient(lead._id)}
                          size="md"
                          colorScheme="orange"
                        >
                          <Text fontSize="sm">
                            {lead.firstName ? `${lead.firstName} ${lead.lastName}` : lead.name} (
                            {lead.email})
                          </Text>
                        </Checkbox>
                      ))}
                    </VStack>
                  ) : (
                    <Text textAlign="center" p={4} color="gray.500">
                      No leads match your search. Try with different keywords.
                    </Text>
                  )}
                </Box>
              </FormControl>

              <HStack spacing={4} justify="flex-end" pt={4}>
                <Button variant="outline" onClick={resetCampaignForm}>
                  Cancel
                </Button>
                <Button colorScheme="orange" leftIcon={<FaCalendarAlt />} onClick={createCampaign}>
                  {editingCampaignId ? 'Update Campaign' : 'Schedule Campaign'}
                </Button>
              </HStack>
            </VStack>
          </Box>
        ) : null}

        {/* Campaign filter tabs */}
        <Flex mb={4} borderBottom="1px solid" borderColor={borderColor}>
          <Button
            variant={campaignFilter === 'all' ? 'solid' : 'ghost'}
            colorScheme={campaignFilter === 'all' ? 'orange' : 'gray'}
            borderRadius="0"
            onClick={() => setCampaignFilter('all')}
            px={4}
            py={2}
            fontWeight="medium"
          >
            All
          </Button>
          <Button
            variant={campaignFilter === 'scheduled' ? 'solid' : 'ghost'}
            colorScheme={campaignFilter === 'scheduled' ? 'orange' : 'gray'}
            borderRadius="0"
            onClick={() => setCampaignFilter('scheduled')}
            px={4}
            py={2}
            fontWeight="medium"
          >
            Scheduled
          </Button>
          <Button
            variant={campaignFilter === 'active' ? 'solid' : 'ghost'}
            colorScheme={campaignFilter === 'active' ? 'orange' : 'gray'}
            borderRadius="0"
            onClick={() => setCampaignFilter('active')}
            px={4}
            py={2}
            fontWeight="medium"
          >
            Active
          </Button>
          <Button
            variant={campaignFilter === 'completed' ? 'solid' : 'ghost'}
            colorScheme={campaignFilter === 'completed' ? 'orange' : 'gray'}
            borderRadius="0"
            onClick={() => setCampaignFilter('completed')}
            px={4}
            py={2}
            fontWeight="medium"
          >
            Completed
          </Button>
          <Button
            variant={campaignFilter === 'paused' ? 'solid' : 'ghost'}
            colorScheme={campaignFilter === 'paused' ? 'orange' : 'gray'}
            borderRadius="0"
            onClick={() => setCampaignFilter('paused')}
            px={4}
            py={2}
            fontWeight="medium"
          >
            Paused
          </Button>
        </Flex>

        {/* Campaigns list */}
        <VStack spacing={4} align="stretch" maxH="calc(100vh - 350px)" overflowY="auto">
          {filteredCampaigns.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              No campaigns found. {campaignFilter !== 'all' ? 'Try changing the filter or ' : ''}
              Create your first campaign to get started.
            </Alert>
          ) : (
            <Table variant="simple" borderWidth="1px" borderRadius="md">
              <Thead>
                <Tr bg={useColorModeValue('gray.50', 'gray.700')}>
                  <Th>Campaign Name</Th>
                  <Th>Sequence</Th>
                  <Th>Start Date</Th>
                  <Th>Recipients</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredCampaigns.map((campaign) => (
                  <Tr key={campaign.id}>
                    <Td fontWeight="medium">{campaign.name}</Td>
                    <Td>
                      <Badge colorScheme="blue">
                        {campaign.steps?.length || 0}{' '}
                        {campaign.steps?.length === 1 ? 'step' : 'steps'}
                      </Badge>
                    </Td>
                    <Td>{formatCampaignDate(campaign.startDate)}</Td>
                    <Td>
                      <Badge colorScheme="green">{campaign.recipientCount} leads</Badge>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={
                          campaign.status === 'completed'
                            ? 'green'
                            : campaign.status === 'active'
                              ? 'blue'
                              : campaign.status === 'scheduled'
                                ? 'purple'
                                : campaign.status === 'paused'
                                  ? 'orange'
                                  : 'gray'
                        }
                        px={2}
                        py={1}
                        borderRadius="full"
                      >
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        {campaign.status !== 'completed' && (
                          <>
                            <IconButton
                              aria-label={
                                campaign.status === 'paused' ? 'Resume campaign' : 'Pause campaign'
                              }
                              icon={
                                campaign.status === 'paused' ? <FaPlayCircle /> : <FaPauseCircle />
                              }
                              size="sm"
                              colorScheme={campaign.status === 'paused' ? 'green' : 'orange'}
                              variant="ghost"
                              onClick={() => toggleCampaignStatus(campaign.id)}
                            />
                            <IconButton
                              aria-label="Edit campaign"
                              icon={<FaEdit />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => startEditingCampaign(campaign)}
                            />
                          </>
                        )}
                        <IconButton
                          aria-label="Delete campaign"
                          icon={<FaTrash />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => deleteCampaign(campaign.id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </VStack>
      </Box>
    );
  };

  // Modify the renderComposeInterface function to add a template selector dropdown
  const renderComposeInterface = () => {
    return (
      <Box p={6} bg={cardBg}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="md" color="orange.600">
            {composeMode === 'reply' ? 'Reply to Email' : 'New Email'}
          </Heading>
          <HStack>
            {/* Add template selector dropdown */}
            <FormControl w="200px">
              <Select
                placeholder="Select Template"
                size="sm"
                onChange={(e) => {
                  if (e.target.value) {
                    const selectedTemplate = templates.find((t) => t.id === e.target.value);
                    if (selectedTemplate) {
                      applyTemplate(selectedTemplate);
                    }
                  }
                }}
                colorScheme="orange"
                borderColor={borderColor}
                value=""
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <Button
              size="sm"
              variant="outline"
              colorScheme="orange"
              leftIcon={<FaSave />}
              onClick={saveCurrentAsTemplate}
            >
              Save as Template
            </Button>
          </HStack>
        </Flex>

        <VStack spacing={5} align="stretch">
          {/* Use our EmailRecipientField component with proper props */}
          <FormControl isRequired>
            <FormLabel fontWeight="medium">To</FormLabel>
            <EmailRecipientField
              value={to}
              onChange={(value) => setTo(value)}
              leads={leads}
              isLoading={leadsLoading}
              colorMode={colorMode}
              onSelectLead={handleLeadSelected}
              toast={toast}
            />
          </FormControl>

          <FormControl>
            <FormLabel fontWeight="medium">Cc</FormLabel>
            <Input
              placeholder="cc@example.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              borderColor={borderColor}
              _focus={{
                borderColor: 'orange.300',
                boxShadow: '0 0 0 1px orange.300',
              }}
            />
          </FormControl>

          <FormControl>
            <FormLabel fontWeight="medium">Bcc</FormLabel>
            <Input
              placeholder="bcc@example.com"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              borderColor={borderColor}
              _focus={{
                borderColor: 'orange.300',
                boxShadow: '0 0 0 1px orange.300',
              }}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontWeight="medium">Subject</FormLabel>
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              borderColor={borderColor}
              _focus={{
                borderColor: 'orange.300',
                boxShadow: '0 0 0 1px orange.300',
              }}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontWeight="medium">Message</FormLabel>
            <Textarea
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              minH="250px"
              borderColor={borderColor}
              _focus={{
                borderColor: 'orange.300',
                boxShadow: '0 0 0 1px orange.300',
              }}
            />
          </FormControl>

          <HStack spacing={4} justifyContent="flex-end" pt={4}>
            <Button onClick={cancelCompose} variant="outline" colorScheme="gray">
              Cancel
            </Button>
            <Button
              leftIcon={<FaPaperPlane />}
              colorScheme="orange"
              onClick={sendEmail}
              px={6}
              isLoading={sendingEmails}
              loadingText="Sending..."
            >
              Send
            </Button>
          </HStack>
        </VStack>

        {/* Progress Modal */}
        <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Sending Emails</ModalHeader>
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Text>
                  Sending {sentEmailsCount} of {totalEmailsToSend} emails...
                </Text>
                <Progress value={emailProgress} size="lg" colorScheme="orange" borderRadius="md" />
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    );
  };

  // Add the missing deleteCampaign function
  const deleteCampaign = (id: string) => {
    setCampaigns((prevCampaigns) => prevCampaigns.filter((campaign) => campaign.id !== id));

    toast({
      title: 'Campaign Deleted',
      description: 'The campaign has been removed',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Add a trashEmail function to handle deleting emails
  const trashEmail = async (emailId: string) => {
    try {
      setLoadingMessages(true);

      const response = await axiosInstance.post(`/api/gmail/messages/${emailId}/trash`);

      if (response.data.success) {
        // Remove the email from the list
        setEmails((prev) => prev.filter((email) => email.id !== emailId));

        toast({
          title: 'Email Deleted',
          description: 'Email has been moved to trash',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error trashing email:', error);
      toast({
        title: 'Error',
        description: 'Failed to move email to trash',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  // Add a function to select all/none emails
  const toggleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(emails.map((email) => email.id));
    }
  };

  // Fix the toggleSelectEmail function to better handle events
  const toggleSelectEmail = (emailId: string, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent opening the email

    setSelectedEmails((prev) => {
      if (prev.includes(emailId)) {
        return prev.filter((id) => id !== emailId);
      } else {
        return [...prev, emailId];
      }
    });
  };

  // Add function to delete multiple emails
  const deleteSelectedEmails = async () => {
    if (selectedEmails.length === 0) return;

    try {
      setLoadingMessages(true);

      // Confirm deletion
      if (!window.confirm(`Move ${selectedEmails.length} email(s) to trash?`)) {
        setLoadingMessages(false);
        return;
      }

      // Track successful deletions
      const deletedIds: string[] = [];

      // Delete each email one by one
      for (const emailId of selectedEmails) {
        try {
          const response = await axiosInstance.post(`/api/gmail/messages/${emailId}/trash`);
          if (response.data.success) {
            deletedIds.push(emailId);
          }
        } catch (error) {
          console.error(`Error trashing email ${emailId}:`, error);
        }
      }

      // Update the emails list to remove deleted emails
      setEmails((prev) => prev.filter((email) => !deletedIds.includes(email.id)));

      // Clear selection
      setSelectedEmails([]);

      // Show success message
      toast({
        title: 'Emails Deleted',
        description: `${deletedIds.length} email(s) moved to trash`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting emails:', error);
      toast({
        title: 'Error',
        description: 'Some emails could not be deleted',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  // Add function to process a single marketplace lead
  const processSingleMarketplaceLead = async () => {
    try {
      setProcessingSingleLead(true);

      const response = await axiosInstance.post('/api/gmail/process-single-marketplace-lead');

      if (response.data.success) {
        toast({
          title: 'Marketplace Lead Processed',
          description: response.data.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'No Lead Processed',
          description: response.data.message,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error processing marketplace lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to process marketplace lead',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setProcessingSingleLead(false);
    }
  };

  return (
    <Container maxW="75%" px={4} py={6} ml={0} marginInlineStart={0}>
      <Flex align="center" mb={6}>
        <Image
          src="https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png"
          alt="Gmail Logo"
          boxSize="40px"
          mr={3}
        />
        <Heading color="orange.600">Gmail Integration</Heading>
      </Flex>
      <Box borderRadius="md" overflow="hidden" boxShadow="lg" bg={cardBg} width="100%">
        {renderConnectionSection()}
      </Box>
    </Container>
  );
};

export default Gmail;
