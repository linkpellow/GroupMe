import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Input,
  Button,
  Spinner,
  Text,
  VStack,
  Badge,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaChartBar } from 'react-icons/fa';
import axiosInstance from '../api/axiosInstance';

interface StatsData {
  totalLeads: number;
}

const Stats: React.FC = () => {
  const toast = useToast();
  
  // State
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const bgColor = useColorModeValue('rgba(248, 250, 252, 0.9)', 'rgba(26, 32, 44, 0.9)');
  const textColor = useColorModeValue('gray.800', 'white');

  // Fetch stats data
  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/leads/stats');
      
      if (response.data && response.data.success) {
        setStatsData(response.data.data);
      } else {
        setError('Failed to load stats data');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load stats. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return (
    <Box bg={bgColor} minHeight="100vh">
      <Container maxW="container.xl" py={6}>
        {/* Header */}
        <Flex mb={6} justify="space-between" align="center" wrap="wrap" gap={4}>
          <Flex align="center">
            <FaChartBar size="28px" color="#FF8C00" style={{ marginRight: '12px' }} />
            <Heading size="lg" color={textColor}>
              Stats Dashboard
            </Heading>
          </Flex>

          <HStack spacing={4}>
            <Button
              colorScheme="orange"
              onClick={refreshStats}
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {/* Loading State */}
        {isLoading && (
          <Flex justify="center" align="center" height="50vh">
            <Spinner size="xl" color="#FF8C00" thickness="4px" />
          </Flex>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Stats Content */}
        {!isLoading && !error && statsData && (
          <VStack spacing={6} align="stretch">
            <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
              <Heading size="md" mb={4} color={textColor}>
                Lead Statistics
              </Heading>
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Text fontSize="lg">Total Leads:</Text>
                  <Badge colorScheme="orange" fontSize="lg" px={3} py={1}>
                    {statsData.totalLeads}
                  </Badge>
                </Flex>
              </VStack>
            </Box>
          </VStack>
        )}
      </Container>
    </Box>
  );
};

export default Stats; 