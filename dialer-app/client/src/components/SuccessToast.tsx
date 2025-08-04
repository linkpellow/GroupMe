import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { FaCheck } from 'react-icons/fa';

interface SuccessToastProps {
  title?: string;
  message: string;
  onClose: () => void;
}

/**
 * A consistent success toast animation component used throughout the application
 */
const SuccessToast: React.FC<SuccessToastProps> = ({ title = 'Success!', message, onClose }) => {
  return (
    <Box
      color="white"
      p={3}
      bg="green.500"
      borderRadius="md"
      display="flex"
      alignItems="center"
      boxShadow="md"
      onClick={onClose}
      cursor="pointer"
      animation="fadeInSlideUp 0.3s ease-out"
      sx={{
        '@keyframes fadeInSlideUp': {
          '0%': {
            opacity: 0,
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      <Box
        mr={3}
        fontSize="xl"
        className="success-icon"
        sx={{
          '@keyframes pulseScale': {
            '0%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.2)' },
            '100%': { transform: 'scale(1)' },
          },
          animation: 'pulseScale 0.5s ease-in-out',
        }}
      >
        <FaCheck />
      </Box>
      <Box>
        <Text fontWeight="bold">{title}</Text>
        <Text fontSize="sm">{message}</Text>
      </Box>
    </Box>
  );
};

export default SuccessToast;
