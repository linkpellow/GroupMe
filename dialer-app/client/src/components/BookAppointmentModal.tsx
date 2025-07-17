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
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  HStack,
  useToast,
  Select,
} from '@chakra-ui/react';
import { Lead } from '../types/Lead';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const toast = useToast();
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('phone');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!lead) return;

    if (!appointmentDate || !appointmentTime) {
      toast({
        title: 'Missing Information',
        description: 'Please select both date and time for the appointment',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Format the appointment details
    const appointmentDetails = `${appointmentType === 'phone' ? '📞' : '👤'} ${appointmentDate} at ${appointmentTime}`;

    // Add to reminders
    if ((window as any).appendDailyGoal) {
      const reminderText = `Appointment: ${lead.name} - ${appointmentDetails}${notes ? ` (${notes})` : ''}`;
      (window as any).appendDailyGoal(reminderText);
    }

    toast({
      title: 'Appointment Booked!',
      description: `${appointmentType === 'phone' ? 'Phone' : 'In-person'} appointment scheduled for ${lead.name}`,
      status: 'success',
      duration: 3000,
    });

    // Reset form and close
    setAppointmentDate('');
    setAppointmentTime('');
    setAppointmentType('phone');
    setNotes('');
    onClose();
  };

  if (!lead) return null;

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Book Appointment - {lead.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Appointment Date</FormLabel>
              <Input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                min={today}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Appointment Time</FormLabel>
              <Input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Appointment Type</FormLabel>
              <Select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}>
                <option value="phone">Phone Call</option>
                <option value="inperson">In Person</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this appointment..."
                rows={3}
              />
            </FormControl>

            <HStack spacing={2} p={2} bg="gray.50" borderRadius="md">
              <span>📧 {lead.email}</span>
              <span>📞 {lead.phone}</span>
            </HStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit}>
            Book Appointment
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BookAppointmentModal;
