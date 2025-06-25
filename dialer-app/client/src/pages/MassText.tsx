import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  Heading,
  useToast,
  Text,
  HStack,
  IconButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon, EditIcon } from '@chakra-ui/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';

interface Template {
  _id: string;
  name: string;
  content: string;
}

const MassText: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const debouncedSaveTemplate = debounce(
    async (templateId: string, updates: { name?: string; content?: string }) => {
      try {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          toast({
            title: 'Error',
            description: 'Failed to save template changes',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save template changes',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    },
    1000
  );

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchTemplates();
  }, [user, navigate]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates', {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleAddPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, '']);
  };

  const handleRemovePhoneNumber = (index: number) => {
    const newPhoneNumbers = phoneNumbers.filter((_, i) => i !== index);
    setPhoneNumbers(newPhoneNumbers);
  };

  const handlePhoneNumberChange = (index: number, value: string) => {
    const newPhoneNumbers = [...phoneNumbers];
    newPhoneNumbers[index] = value;
    setPhoneNumbers(newPhoneNumbers);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t._id === templateId);
    if (template) {
      setMessage(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const handleTemplateChange = (field: 'name' | 'content', value: string) => {
    if (editingTemplate) {
      setNewTemplate((prev) => ({ ...prev, [field]: value }));
      debouncedSaveTemplate(editingTemplate._id, { [field]: value });
    } else {
      setNewTemplate((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const method = editingTemplate ? 'PUT' : 'POST';
      const url = editingTemplate ? `/api/templates/${editingTemplate._id}` : '/api/templates';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: newTemplate.name,
          content: newTemplate.content,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Template ${editingTemplate ? 'updated' : 'created'} successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchTemplates();
        onClose();
        setNewTemplate({ name: '', content: '' });
        setEditingTemplate(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Template deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchTemplates();
        if (selectedTemplate === templateId) {
          setSelectedTemplate('');
          setMessage('');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplate({ name: template.name, content: template.content });
    onOpen();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validPhoneNumbers = phoneNumbers.filter((phone) => phone.trim() !== '');
      if (validPhoneNumbers.length === 0) {
        toast({
          title: 'Error',
          description: 'Please enter at least one phone number',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Add rate limiting warning for large batches
      if (validPhoneNumbers.length > 50) {
        const proceed = window.confirm(
          'Sending a large number of messages at once may be rate limited by Twilio. Continue?'
        );
        if (!proceed) {
          setIsLoading(false);
          return;
        }
      }

      // Add message length validation
      if (message.length > 1600) {
        toast({
          title: 'Error',
          description: 'Message exceeds maximum length of 1600 characters',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch('/api/messages/send-mass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          phoneNumbers: validPhoneNumbers,
          message,
          templateId: selectedTemplate || undefined,
          scheduledTime: scheduledTime || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send messages');
      }

      const data = await response.json();

      // Handle individual message results
      const successCount = data.results.filter((result: any) => result.success).length;
      const failureCount = data.results.length - successCount;

      if (successCount === 0) {
        toast({
          title: 'Error',
          description: 'All messages failed to send. Please check the phone numbers and try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else if (failureCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Successfully sent ${successCount} messages. ${failureCount} messages failed.`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Success',
          description: `Successfully sent ${successCount} messages`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }

      // Only clear form if at least one message was sent successfully
      if (successCount > 0) {
        setPhoneNumbers(['']);
        setMessage('');
        setScheduledTime('');
        setSelectedTemplate('');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send messages',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading>Mass Text Messages</Heading>

        <form onSubmit={handleSubmit}>
          <VStack spacing={6} align="stretch">
            <HStack justify="space-between" align="center">
              <Text fontSize="2xl">Mass Text</Text>
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                onClick={() => {
                  setEditingTemplate(null);
                  setNewTemplate({ name: '', content: '' });
                  onOpen();
                }}
              >
                New Template
              </Button>
            </HStack>

            <FormControl>
              <FormLabel>Template</FormLabel>
              <Select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                placeholder="Select template"
              >
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </Select>
              {selectedTemplate && (
                <HStack mt={2}>
                  <IconButton
                    aria-label="Edit template"
                    icon={<EditIcon />}
                    size="sm"
                    onClick={() =>
                      handleEditTemplate(templates.find((t) => t._id === selectedTemplate)!)
                    }
                  />
                  <IconButton
                    aria-label="Delete template"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDeleteTemplate(selectedTemplate)}
                  />
                </HStack>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Message</FormLabel>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message"
                rows={4}
                required
              />
            </FormControl>

            <FormControl>
              <FormLabel>Schedule Time (Optional)</FormLabel>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Phone Numbers</FormLabel>
              <VStack spacing={2} align="stretch">
                {phoneNumbers.map((phone, index) => (
                  <HStack key={index}>
                    <Input
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                      pattern="[0-9+()-\s]+"
                    />
                    <Tooltip label="Remove phone number">
                      <IconButton
                        aria-label="Remove phone number"
                        icon={<DeleteIcon />}
                        onClick={() => handleRemovePhoneNumber(index)}
                        colorScheme="red"
                        isDisabled={phoneNumbers.length === 1}
                      />
                    </Tooltip>
                  </HStack>
                ))}
                <Button
                  leftIcon={<AddIcon />}
                  onClick={handleAddPhoneNumber}
                  colorScheme="blue"
                  variant="outline"
                >
                  Add Phone Number
                </Button>
              </VStack>
            </FormControl>

            <Button type="submit" colorScheme="blue" size="lg" isLoading={isLoading}>
              {scheduledTime ? 'Schedule Messages' : 'Send Now'}
            </Button>
          </VStack>
        </form>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingTemplate ? 'Edit Template' : 'New Template'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Template Name</FormLabel>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => handleTemplateChange('name', e.target.value)}
                  placeholder="Enter template name"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Template Content</FormLabel>
                <Textarea
                  value={newTemplate.content}
                  onChange={(e) => handleTemplateChange('content', e.target.value)}
                  placeholder="Enter template content"
                  rows={4}
                />
              </FormControl>
              <Button colorScheme="blue" onClick={handleSaveTemplate}>
                Save Template
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default MassText;
