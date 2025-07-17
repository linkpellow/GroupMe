import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Select,
  Text,
  Spinner,
  useToast,
  Box,
  Flex,
} from '@chakra-ui/react';
import axiosInstance from '../api/axiosInstance';

interface Campaign {
  _id: string;
  name: string;
  status: string;
  recipientCount: number;
}

interface CampaignSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

const CampaignSelectionModal: React.FC<CampaignSelectionModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const toast = useToast();

  // Fetch available campaigns
  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
    }
  }, [isOpen]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/campaigns');

      // Filter out completed campaigns
      const activeCampaigns = response.data.filter(
        (campaign: Campaign) => campaign.status !== 'completed'
      );

      setCampaigns(activeCampaigns);

      // Select the first campaign by default if available
      if (activeCampaigns.length > 0) {
        setSelectedCampaign(activeCampaigns[0]._id);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email campaigns',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCampaign = async () => {
    if (!selectedCampaign) {
      toast({
        title: 'Please select a campaign',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await axiosInstance.post('/api/campaigns/add-lead', {
        campaignId: selectedCampaign,
        leadId,
      });

      toast({
        title: 'Success',
        description: `Added ${leadName} to campaign successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
    } catch (error: unknown) {
      console.error('Error adding lead to campaign:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add lead to campaign',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add to Email Campaign</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={4}>
            Select a campaign to add <strong>{leadName}</strong> to:
          </Text>

          {isLoading ? (
            <Flex justify="center" py={4}>
              <Spinner />
            </Flex>
          ) : campaigns.length === 0 ? (
            <Box p={4} bg="gray.100" borderRadius="md">
              <Text align="center">
                No active campaigns found. Create a campaign in the Gmail section first.
              </Text>
            </Box>
          ) : (
            <Select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              placeholder="Select campaign"
            >
              {campaigns.map((campaign) => (
                <option key={campaign._id} value={campaign._id}>
                  {campaign.name} ({campaign.recipientCount} recipients)
                </option>
              ))}
            </Select>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleAddToCampaign}
            isLoading={isSubmitting}
            isDisabled={isLoading || campaigns.length === 0 || !selectedCampaign}
          >
            Add to Campaign
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CampaignSelectionModal;
