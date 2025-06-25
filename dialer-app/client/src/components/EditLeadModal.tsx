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
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  HStack,
  useToast,
  Grid,
  GridItem,
  Text,
  Divider,
} from '@chakra-ui/react';
import { Lead } from '../types/Lead';
import axiosInstance from '../api/axiosInstance';

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
  'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
  'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
  'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
  'WI', 'WY',
];

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    zipcode: '',
    dob: '',
    height: '',
    weight: '',
    gender: '',
    notes: '',
    disposition: '',
    source: '',
    company: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        city: lead.city || '',
        state: lead.state || '',
        zipcode: lead.zipcode || '',
        dob: lead.dob || '',
        height: lead.height || '',
        weight: lead.weight || '',
        gender: lead.gender || '',
        notes: lead.notes || '',
        disposition: lead.disposition || '',
        source: lead.source || '',
        company: (lead as any).company || '',
      });
    }
  }, [lead]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!lead) return;

    setIsLoading(true);
    try {
      const fullName = formData.name || `${formData.firstName} ${formData.lastName}`.trim();
      const updateData = { ...formData, name: fullName };

      await axiosInstance.put(`/api/leads/${lead._id}`, updateData);

      toast({
        title: 'Lead updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: 'Failed to update lead',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxWidth="800px">
        <ModalHeader>Edit Lead</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Personal Information */}
            <VStack align="stretch" spacing={4}>
              <Text fontWeight="bold" fontSize="lg">
                Personal Information
              </Text>
              <Divider />

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>First Name</FormLabel>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="First Name"
                    />
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Last Name"
                    />
                  </FormControl>
                </GridItem>

                <GridItem colSpan={2}>
                  <FormControl>
                    <FormLabel>Full Name</FormLabel>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Full Name (overrides first/last)"
                    />
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                    />
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>Phone</FormLabel>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                    />
                  </FormControl>
                </GridItem>
              </Grid>
            </VStack>

            {/* Address Information */}
            <VStack align="stretch" spacing={4}>
              <Text fontWeight="bold" fontSize="lg">
                Address
              </Text>
              <Divider />

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem colSpan={2}>
                  <FormControl>
                    <FormLabel>City</FormLabel>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                    />
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>State</FormLabel>
                    <Select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="Select state"
                    >
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>ZIP Code</FormLabel>
                    <Input
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={handleInputChange}
                      placeholder="12345"
                    />
                  </FormControl>
                </GridItem>
              </Grid>
            </VStack>

            {/* Health Information */}
            <VStack align="stretch" spacing={4}>
              <Text fontWeight="bold" fontSize="lg">
                Health Information
              </Text>
              <Divider />

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>Date of Birth</FormLabel>
                    <Input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleInputChange}
                    />
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      placeholder="Select gender"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                    </Select>
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>Height</FormLabel>
                    <Input
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      placeholder="5 ft 10 in"
                    />
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>Weight</FormLabel>
                    <Input
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      placeholder="180"
                    />
                  </FormControl>
                </GridItem>
              </Grid>
            </VStack>

            {/* Lead Information */}
            <VStack align="stretch" spacing={4}>
              <Text fontWeight="bold" fontSize="lg">
                Lead Information
              </Text>
              <Divider />

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>Source</FormLabel>
                    <Input
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      placeholder="Lead source"
                    />
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>Company</FormLabel>
                    <Input
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Company name"
                    />
                  </FormControl>
                </GridItem>

                <GridItem>
                  <FormControl>
                    <FormLabel>Disposition</FormLabel>
                    <Input
                      name="disposition"
                      value={formData.disposition}
                      onChange={handleInputChange}
                      placeholder="Disposition"
                    />
                  </FormControl>
                </GridItem>

                <GridItem colSpan={2}>
                  <FormControl>
                    <FormLabel>Notes</FormLabel>
                    <Textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Additional notes..."
                      rows={4}
                    />
                  </FormControl>
                </GridItem>
              </Grid>
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={isLoading}>
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditLeadModal;
