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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Wrap,
  WrapItem,
  Divider,
} from '@chakra-ui/react';
import { FaChartBar, FaMapMarkerAlt, FaDollarSign, FaHashtag, FaBuilding } from 'react-icons/fa';
import axiosInstance from '../api/axiosInstance';
import { useSourceCodeQuality } from '../hooks/useSourceCodeQuality';
import SourceCodeBadge from '../components/SourceCodeBadge';
import QualityFilter, { QualityFilter as QualityFilterType } from '../components/QualityFilter';

interface FilterOptions {
  states: string[];
  dispositions: string[];
  sources: string[];
}

interface Breakdowns {
  prices: number[];
  sourceHashes: string[];
  campaigns: string[];
  sourceCodes: string[];
  cities: string[];
}

interface Counts {
  uniqueStates: number;
  uniqueDispositions: number;
  uniqueSources: number;
  uniquePrices: number;
  uniqueCampaigns: number;
  uniqueSourceCodes: number;
  uniqueCities: number;
}

interface StatsData {
  totalLeads: number;
  filterOptions?: FilterOptions;
  breakdowns?: Breakdowns;
  counts?: Counts;
}

const Stats: React.FC = () => {
  const toast = useToast();
  
  // State
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<QualityFilterType>('all');

  // Quality management
  const {
    qualityMap,
    qualityCounts,
    getQuality,
    cycleQuality,
    isLoading: qualityLoading
  } = useSourceCodeQuality();

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

  // Filter source codes based on quality
  const getFilteredSourceCodes = useCallback(() => {
    if (!statsData?.breakdowns?.sourceCodes) return [];
    
    return statsData.breakdowns.sourceCodes.filter(code => {
      const quality = getQuality(code);
      
      switch (qualityFilter) {
        case 'quality':
          return quality === 'quality';
        case 'low-quality':
          return quality === 'low-quality';
        case 'unassigned':
          return quality === null;
        case 'all':
        default:
          return true;
      }
    });
  }, [statsData?.breakdowns?.sourceCodes, qualityFilter, getQuality]);

  // Calculate quality counts for the current source codes
  const getQualityFilterCounts = useCallback(() => {
    if (!statsData?.breakdowns?.sourceCodes) {
      return { total: 0, quality: 0, 'low-quality': 0, unassigned: 0 };
    }

    const sourceCodes = statsData.breakdowns.sourceCodes;
    const counts = {
      total: sourceCodes.length,
      quality: 0,
      'low-quality': 0,
      unassigned: 0
    };

    sourceCodes.forEach(code => {
      const quality = getQuality(code);
      if (quality === 'quality') {
        counts.quality++;
      } else if (quality === 'low-quality') {
        counts['low-quality']++;
      } else {
        counts.unassigned++;
      }
    });

    return counts;
  }, [statsData?.breakdowns?.sourceCodes, getQuality]);

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
            {/* Overview Section */}
            <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
              <Heading size="md" mb={4} color={textColor}>
                Lead Overview
              </Heading>
              <StatGroup>
                <Stat>
                  <StatLabel>Total Leads</StatLabel>
                  <StatNumber color="orange.500">{statsData.totalLeads}</StatNumber>
                </Stat>
                {statsData.counts && (
                  <>
                    <Stat>
                      <StatLabel>Unique States</StatLabel>
                      <StatNumber color="blue.500">{statsData.counts.uniqueStates}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Unique Sources</StatLabel>
                      <StatNumber color="green.500">{statsData.counts.uniqueSources}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Active Campaigns</StatLabel>
                      <StatNumber color="purple.500">{statsData.counts.uniqueCampaigns}</StatNumber>
                    </Stat>
                  </>
                )}
              </StatGroup>
            </Box>

            {/* Filter Options Section */}
            {statsData.filterOptions && (
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
                  <Flex align="center" mb={4}>
                    <FaMapMarkerAlt color="#3182CE" style={{ marginRight: '8px' }} />
                    <Heading size="sm" color={textColor}>
                      States ({statsData.filterOptions.states.length})
                    </Heading>
                  </Flex>
                  <Wrap spacing={2}>
                    {statsData.filterOptions.states.slice(0, 10).map((state) => (
                      <WrapItem key={state}>
                        <Badge colorScheme="blue" variant="outline">
                          {state}
                        </Badge>
                      </WrapItem>
                    ))}
                    {statsData.filterOptions.states.length > 10 && (
                      <WrapItem>
                        <Badge colorScheme="gray">
                          +{statsData.filterOptions.states.length - 10} more
                        </Badge>
                      </WrapItem>
                    )}
                  </Wrap>
                </Box>

                <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
                  <Flex align="center" mb={4}>
                    <FaBuilding color="#38A169" style={{ marginRight: '8px' }} />
                    <Heading size="sm" color={textColor}>
                      Sources ({statsData.filterOptions.sources.length})
                    </Heading>
                  </Flex>
                  <Wrap spacing={2}>
                    {statsData.filterOptions.sources.map((source) => (
                      <WrapItem key={source}>
                        <Badge colorScheme="green" variant="outline">
                          {source}
                        </Badge>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>

                <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
                  <Flex align="center" mb={4}>
                    <FaHashtag color="#805AD5" style={{ marginRight: '8px' }} />
                    <Heading size="sm" color={textColor}>
                      Dispositions ({statsData.filterOptions.dispositions.length})
                    </Heading>
                  </Flex>
                  <Wrap spacing={2}>
                    {statsData.filterOptions.dispositions.slice(0, 8).map((disposition) => (
                      <WrapItem key={disposition}>
                        <Badge colorScheme="purple" variant="outline">
                          {disposition}
                        </Badge>
                      </WrapItem>
                    ))}
                    {statsData.filterOptions.dispositions.length > 8 && (
                      <WrapItem>
                        <Badge colorScheme="gray">
                          +{statsData.filterOptions.dispositions.length - 8} more
                        </Badge>
                      </WrapItem>
                    )}
                  </Wrap>
                </Box>
              </SimpleGrid>
            )}

            {/* Advanced Breakdowns Section */}
            {statsData.breakdowns && (
              <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
                <Heading size="md" mb={4} color={textColor}>
                  Data Insights
                </Heading>
                
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                  {/* Price Analysis */}
                  {statsData.breakdowns.prices.length > 0 && (
                    <Box>
                      <Flex align="center" mb={3}>
                        <FaDollarSign color="#D69E2E" style={{ marginRight: '8px' }} />
                        <Heading size="sm" color={textColor}>
                          Lead Prices (Top {Math.min(statsData.breakdowns.prices.length, 10)})
                        </Heading>
                      </Flex>
                      <Wrap spacing={2}>
                        {statsData.breakdowns.prices.slice(0, 10).map((price, index) => (
                          <WrapItem key={index}>
                            <Badge colorScheme="yellow" variant="solid">
                              ${price}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  {/* Campaign Analysis */}
                  {statsData.breakdowns.campaigns.length > 0 && (
                    <Box>
                      <Flex align="center" mb={3}>
                        <FaBuilding color="#38A169" style={{ marginRight: '8px' }} />
                        <Heading size="sm" color={textColor}>
                          Active Campaigns (Top {Math.min(statsData.breakdowns.campaigns.length, 8)})
                        </Heading>
                      </Flex>
                      <Wrap spacing={2}>
                        {statsData.breakdowns.campaigns.slice(0, 8).map((campaign, index) => (
                          <WrapItem key={index}>
                            <Badge colorScheme="green" variant="outline">
                              {campaign}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  {/* Cities Analysis */}
                  {statsData.breakdowns.cities.length > 0 && (
                    <Box>
                      <Flex align="center" mb={3}>
                        <FaMapMarkerAlt color="#3182CE" style={{ marginRight: '8px' }} />
                        <Heading size="sm" color={textColor}>
                          Top Cities ({Math.min(statsData.breakdowns.cities.length, 10)})
                        </Heading>
                      </Flex>
                      <Wrap spacing={2}>
                        {statsData.breakdowns.cities.slice(0, 10).map((city, index) => (
                          <WrapItem key={index}>
                            <Badge colorScheme="blue" variant="outline">
                              {city}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  {/* Source Codes Analysis with Quality System */}
                  {statsData.breakdowns.sourceCodes.length > 0 && (
                    <Box>
                      <VStack align="stretch" spacing={4}>
                        {/* Header and Filter */}
                        <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
                          <Flex align="center">
                            <FaHashtag color="#805AD5" style={{ marginRight: '8px' }} />
                            <Heading size="sm" color={textColor}>
                              Source Codes ({getFilteredSourceCodes().length} of {statsData.breakdowns.sourceCodes.length})
                            </Heading>
                          </Flex>
                          
                          <Box minW="200px">
                            <QualityFilter
                              value={qualityFilter}
                              onChange={setQualityFilter}
                              counts={getQualityFilterCounts()}
                              isLoading={qualityLoading}
                            />
                          </Box>
                        </Flex>

                        {/* Source Code Badges */}
                        <Wrap spacing={2}>
                          {getFilteredSourceCodes().slice(0, 20).map((code, index) => (
                            <WrapItem key={index}>
                              <SourceCodeBadge
                                code={code}
                                quality={getQuality(code)}
                                onQualityChange={cycleQuality}
                                size="md"
                              />
                            </WrapItem>
                          ))}
                          {getFilteredSourceCodes().length > 20 && (
                            <WrapItem>
                              <Badge colorScheme="gray" variant="outline">
                                +{getFilteredSourceCodes().length - 20} more
                              </Badge>
                            </WrapItem>
                          )}
                        </Wrap>

                        {/* Quality Summary */}
                        {qualityFilter === 'all' && (
                          <HStack spacing={4} pt={2}>
                            <Badge colorScheme="green" variant="solid" px={2} py={1}>
                              ✓ Quality: {getQualityFilterCounts().quality}
                            </Badge>
                            <Badge colorScheme="red" variant="solid" px={2} py={1}>
                              ✗ Low Quality: {getQualityFilterCounts()['low-quality']}
                            </Badge>
                            <Badge colorScheme="gray" variant="outline" px={2} py={1}>
                              ? Unassigned: {getQualityFilterCounts().unassigned}
                            </Badge>
                          </HStack>
                        )}
                      </VStack>
                    </Box>
                  )}
                </SimpleGrid>

                {/* Summary Metrics */}
                {statsData.counts && (
                  <>
                    <Divider my={6} />
                    <Heading size="sm" mb={4} color={textColor}>
                      Data Summary
                    </Heading>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                      <Stat size="sm">
                        <StatLabel>Unique Prices</StatLabel>
                        <StatNumber fontSize="lg">{statsData.counts.uniquePrices}</StatNumber>
                      </Stat>
                      <Stat size="sm">
                        <StatLabel>Source Hashes</StatLabel>
                        <StatNumber fontSize="lg">{statsData.counts.uniqueSourceCodes}</StatNumber>
                      </Stat>
                      <Stat size="sm">
                        <StatLabel>Cities</StatLabel>
                        <StatNumber fontSize="lg">{statsData.counts.uniqueCities}</StatNumber>
                      </Stat>
                      <Stat size="sm">
                        <StatLabel>Dispositions</StatLabel>
                        <StatNumber fontSize="lg">{statsData.counts.uniqueDispositions}</StatNumber>
                      </Stat>
                    </SimpleGrid>
                  </>
                )}
              </Box>
            )}

            {/* Fallback for basic mode */}
            {!statsData.filterOptions && !statsData.breakdowns && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                Showing basic stats mode. Enhanced analytics will be available when data is loaded.
              </Alert>
            )}
          </VStack>
        )}
      </Container>
    </Box>
  );
};

export default Stats; 