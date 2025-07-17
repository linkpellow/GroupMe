import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Select,
  useToast,
  Spinner,
  VStack,
  Text,
  Flex,
  Image,
} from "@chakra-ui/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../api/axiosInstance";

interface AddToCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  onSuccess?: () => void;
}

interface Campaign {
  id: string;
  title: string;
  type: string;
}

const fetchCampaigns = async (): Promise<Campaign[]> => {
  const { data } = await axiosInstance.get("/textdrip/campaigns");
  return data || [];
};

const brandColor = 'purple.600';

export const AddToCampaignModal: React.FC<AddToCampaignModalProps> = ({
  isOpen,
  onClose,
  leadId,
  onSuccess,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
    enabled: isOpen,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!leadId || !selectedCampaignId) throw new Error("Missing selections");
      await axiosInstance.post(`/textdrip/campaign`, {
        leadId,
        campaignId: selectedCampaignId,
      });
    },
    onSuccess: () => {
      toast({ title: "Lead added to campaign", status: "success" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to add to campaign",
        description: err?.response?.data?.message || err.message,
        status: "error",
      });
    },
  });

  const handleSave = () => {
    addMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md" motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
      <ModalContent borderRadius="lg" overflow="hidden">
        <Flex align="center" bg={brandColor} color="white" px={4} py={3}>
          <Image src="/images/logo_final.png" alt="TextDrip" h="32px" w="auto" mr={3} />
          <ModalHeader m={0} p={0} fontSize="lg" fontWeight="bold" flex="1">
            Select Campaign
          </ModalHeader>
        </Flex>
        <ModalCloseButton color="white" top="12px" right="12px" />
        <ModalBody bg="gray.50">
          {isLoading ? (
            <VStack py={6}>
              <Spinner />
              <Text>Loading campaigns…</Text>
            </VStack>
          ) : (
            <Select
              placeholder="Select campaign"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
            >
              {campaigns.length === 0 ? (
                <option disabled>No campaigns found</option>
              ) : (
                campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))
              )}
            </Select>
          )}
        </ModalBody>
        <ModalFooter bg="gray.100">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            bg={brandColor}
            _hover={{ bg: 'purple.700' }}
            color="white"
            onClick={handleSave}
            isLoading={addMutation.isPending}
            isDisabled={!selectedCampaignId}
          >
            Add
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 