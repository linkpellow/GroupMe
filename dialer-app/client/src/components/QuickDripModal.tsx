import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Textarea,
  useToast,
  FormControl,
  FormLabel,
  Flex,
  Image,
} from '@chakra-ui/react';
import axiosInstance from '../api/axiosInstance';

interface QuickDripModalProps {
  lead: any;
  onClose: () => void;
}

export const QuickDripModal: React.FC<QuickDripModalProps> = ({ lead, onClose }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const brandColor = 'purple.600';

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message is empty',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post('/textdrip/quick-drip', {
        leadId: lead._id,
        message,
      });
      toast({
        title: 'Message sent successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to send message',
        description: error.response?.data?.message || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} isCentered motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
      <ModalContent borderRadius="lg" overflow="hidden">
        <Flex align="center" bg={brandColor} color="white" px={4} py={3}>
          <Image src="/images/logo_final.png" alt="TextDrip" h="32px" w="auto" mr={3} />
          <ModalHeader m={0} p={0} fontSize="lg" fontWeight="bold" flex="1">
            Quick Drip to {lead.name}
          </ModalHeader>
        </Flex>
        <ModalCloseButton color="white" top="12px" right="12px" />
        <ModalBody bg="gray.50">
          <FormControl>
            <FormLabel>Message</FormLabel>
            <Textarea
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter bg="gray.100">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button bg={brandColor} _hover={{ bg: 'purple.700' }} color="white" onClick={handleSend} isLoading={isLoading}>
            Send Message
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 