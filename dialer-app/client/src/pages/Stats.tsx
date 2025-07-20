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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
} from '@chakra-ui/react';
import { FaChartBar, FaMapMarkerAlt, FaDollarSign, FaHashtag, FaBuilding, FaTrophy, FaUserCheck, FaCalculator, FaArrowUp } from 'react-icons/fa';
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

// Analytics interfaces for new dashboard screens
interface SourceCodeAnalytics {
  _id: string;
  totalLeads: number;
  soldLeads: number;
  totalRevenue: number;
  totalSpent: number;
  conversionRate: number;
  quality?: 'quality' | 'low-quality' | null;
}

interface CPAAnalytics {
  totalSpent: number;
  soldCount: number;
  cpa: number;
  leads: Array<{
    name: string;
    price: number;
    purchaseDate: string;
    sourceCode: string;
    state: string;
  }>;
}

interface CampaignAnalytics {
  _id: string;
  totalLeads: number;
  soldLeads: number;
  totalSpent: number;
  revenue: number;
  conversionRate: number;
  roi: number;
}

interface LeadDetailsAnalytics {
  name: string;
  state: string;
  disposition: string;
  price: number;
  purchaseDate: string;
  sourceCode: string;
  campaignName: string;
  city: string;
}

interface DemographicsAnalytics {
  _id: string;
  soldCount: number;
  totalSpent: number;
  avgPrice: number;
  avgCPA: number;
}

interface AnalyticsData {
  sourceCode: SourceCodeAnalytics[];
  cpa: CPAAnalytics;
  campaign: CampaignAnalytics[];
  leadDetails: LeadDetailsAnalytics[];
  demographics: DemographicsAnalytics[];
}

const Stats: React.FC = () => {
  const toast = useToast();
  
  // State for existing functionality
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<QualityFilterType>('all');

  // State for new analytics dashboard
  const [activeTab, setActiveTab] = useState(0);
  const [timePeriod, setTimePeriod] = useState('weekly');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  // Fetch original stats data (backward compatibility)
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

  // Fetch analytics data for dashboard screens
  const fetchAnalyticsData = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [sourceCodeRes, cpaRes, campaignRes, leadDetailsRes, demographicsRes] = await Promise.all([
        axiosInstance.get(`/analytics/sold/source-codes?period=${timePeriod}`),
        axiosInstance.get(`/analytics/sold/cpa?period=${timePeriod}`),
        axiosInstance.get(`/analytics/sold/campaigns?period=${timePeriod}`),
        axiosInstance.get(`/analytics/sold/lead-details?period=${timePeriod}`),
        axiosInstance.get(`/analytics/sold/demographics?period=${timePeriod}`)
      ]);

      setAnalyticsData({
        sourceCode: sourceCodeRes.data.data || [],
        cpa: cpaRes.data.data || { totalSpent: 0, soldCount: 0, cpa: 0, leads: [] },
        campaign: campaignRes.data.data || [],
        leadDetails: leadDetailsRes.data.data || [],
        demographics: demographicsRes.data.data || []
      });
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      toast({
        title: 'Analytics Error',
        description: 'Failed to load analytics data. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [timePeriod, toast]);

  // Filter source codes based on quality (existing functionality)
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

  // Load data on mount and when dependencies change
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Metric Display Component
  const MetricDisplay: React.FC<{
    label: string;
    value: string | number;
    icon: React.ElementType;
    colorScheme?: string;
  }> = ({ label, value, icon: Icon, colorScheme = "blue" }) => (
    <Stat>
      <StatLabel>{label}</StatLabel>
      <StatNumber color={`${colorScheme}.500`}>
        <HStack>
          <Icon />
          <Text>{value}</Text>
        </HStack>
      </StatNumber>
    </Stat>
  );

  // Analytics Card Component
  const AnalyticsCard: React.FC<{
    title: string;
    children: React.ReactNode;
    isLoading?: boolean;
  }> = ({ title, children, isLoading = false }) => (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
      <Heading size="md" mb={4}>{title}</Heading>
      {isLoading ? <Spinner /> : children}
    </Box>
  );

  // Source Code Screen Component
  const SourceCodeScreen = () => (
    <VStack spacing={6} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <MetricDisplay 
          label="Total Source Codes" 
          value={analyticsData?.sourceCode?.length || 0}
          icon={FaHashtag}
          colorScheme="purple"
        />
        <MetricDisplay 
          label="Quality Codes" 
          value={analyticsData?.sourceCode?.filter(s => s.quality === 'quality').length || 0}
          icon={FaTrophy}
          colorScheme="green"
        />
        <MetricDisplay 
          label="Total SOLD Leads" 
          value={analyticsData?.sourceCode?.reduce((sum, s) => sum + s.soldLeads, 0) || 0}
          icon={FaUserCheck}
          colorScheme="blue"
        />
      </SimpleGrid>
      
      <AnalyticsCard title="Source Code Performance" isLoading={analyticsLoading}>
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Source Code</Th>
                <Th>Quality</Th>
                <Th isNumeric>Total Leads</Th>
                <Th isNumeric>SOLD</Th>
                <Th isNumeric>Conversion %</Th>
                <Th isNumeric>Revenue</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analyticsData?.sourceCode?.slice(0, 20).map((code, index) => (
                <Tr key={index}>
                  <Td>
                                         <SourceCodeBadge 
                       code={code._id} 
                       quality={code.quality || null} 
                       onQualityChange={cycleQuality}
                     />
                  </Td>
                  <Td>
                    <Badge colorScheme={code.quality === 'quality' ? 'green' : code.quality === 'low-quality' ? 'red' : 'gray'}>
                      {code.quality || 'Unassigned'}
                    </Badge>
                  </Td>
                  <Td isNumeric>{code.totalLeads}</Td>
                  <Td isNumeric>{code.soldLeads}</Td>
                  <Td isNumeric>{code.conversionRate.toFixed(1)}%</Td>
                  <Td isNumeric>${code.totalRevenue.toFixed(2)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </AnalyticsCard>
    </VStack>
  );

  // CPA Screen Component
  const CPAScreen = () => (
    <VStack spacing={6} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
        <MetricDisplay 
          label="Total Spent" 
          value={`$${analyticsData?.cpa?.totalSpent?.toFixed(2) || '0.00'}`}
          icon={FaDollarSign}
          colorScheme="green"
        />
        <MetricDisplay 
          label="SOLD Leads" 
          value={analyticsData?.cpa?.soldCount || 0}
          icon={FaUserCheck}
          colorScheme="blue"
        />
        <MetricDisplay 
          label="Cost Per Acquisition" 
          value={`$${analyticsData?.cpa?.cpa?.toFixed(2) || '0.00'}`}
          icon={FaCalculator}
          colorScheme="orange"
        />
                 <MetricDisplay 
           label="Avg Lead Cost" 
           value={`$${((analyticsData?.cpa?.totalSpent || 0) / Math.max(analyticsData?.cpa?.leads?.length || 1, 1)).toFixed(2)}`}
           icon={FaArrowUp}
           colorScheme="purple"
         />
      </SimpleGrid>
      
      <AnalyticsCard title="SOLD Lead Cost Breakdown" isLoading={analyticsLoading}>
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Lead Name</Th>
                <Th>Source Code</Th>
                <Th>State</Th>
                <Th isNumeric>Price</Th>
                <Th>Purchase Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analyticsData?.cpa?.leads?.slice(0, 50).map((lead, index) => (
                                 <Tr key={index}>
                   <Td>{lead.name}</Td>
                   <Td>
                     <SourceCodeBadge 
                       code={lead.sourceCode} 
                       quality={getQuality(lead.sourceCode)} 
                       onQualityChange={cycleQuality}
                       size="sm" 
                     />
                   </Td>
                   <Td>{lead.state}</Td>
                   <Td isNumeric>${lead.price.toFixed(2)}</Td>
                   <Td>{new Date(lead.purchaseDate).toLocaleDateString()}</Td>
                 </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </AnalyticsCard>
    </VStack>
  );

  // Campaign Screen Component
  const CampaignScreen = () => (
    <VStack spacing={6} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <MetricDisplay 
          label="Active Campaigns" 
          value={analyticsData?.campaign?.length || 0}
          icon={FaBuilding}
          colorScheme="blue"
        />
        <MetricDisplay 
          label="Top Campaign SOLD" 
          value={analyticsData?.campaign?.[0]?.soldLeads || 0}
          icon={FaTrophy}
          colorScheme="green"
        />
                 <MetricDisplay 
           label="Best Conversion Rate" 
           value={`${analyticsData?.campaign?.[0]?.conversionRate?.toFixed(1) || 0}%`}
           icon={FaArrowUp}
           colorScheme="orange"
         />
      </SimpleGrid>
      
      <AnalyticsCard title="Campaign Performance Rankings" isLoading={analyticsLoading}>
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Rank</Th>
                <Th>Campaign Name</Th>
                <Th isNumeric>Total Leads</Th>
                <Th isNumeric>SOLD</Th>
                <Th isNumeric>Conversion %</Th>
                <Th isNumeric>Revenue</Th>
                <Th isNumeric>ROI %</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analyticsData?.campaign?.slice(0, 20).map((campaign, index) => (
                <Tr key={index}>
                  <Td>{index + 1}</Td>
                  <Td>{campaign._id}</Td>
                  <Td isNumeric>{campaign.totalLeads}</Td>
                  <Td isNumeric>{campaign.soldLeads}</Td>
                  <Td isNumeric>{campaign.conversionRate.toFixed(1)}%</Td>
                  <Td isNumeric>${campaign.revenue.toFixed(2)}</Td>
                  <Td isNumeric>
                    <Text color={campaign.roi >= 0 ? 'green.500' : 'red.500'}>
                      {campaign.roi.toFixed(1)}%
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </AnalyticsCard>
    </VStack>
  );

  // Lead Details Screen Component
  const LeadDetailsScreen = () => (
    <VStack spacing={6} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <MetricDisplay 
          label="Total SOLD Leads" 
          value={analyticsData?.leadDetails?.length || 0}
          icon={FaUserCheck}
          colorScheme="blue"
        />
        <MetricDisplay 
          label="Total Revenue" 
          value={`$${analyticsData?.leadDetails?.reduce((sum, lead) => sum + lead.price, 0).toFixed(2) || '0.00'}`}
          icon={FaDollarSign}
          colorScheme="green"
        />
        <MetricDisplay 
          label="Average Deal Size" 
          value={`$${((analyticsData?.leadDetails?.reduce((sum, lead) => sum + lead.price, 0) || 0) / Math.max(analyticsData?.leadDetails?.length || 1, 1)).toFixed(2)}`}
          icon={FaCalculator}
          colorScheme="purple"
        />
      </SimpleGrid>
      
      <AnalyticsCard title="SOLD Lead Details" isLoading={analyticsLoading}>
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Lead Name</Th>
                <Th>State</Th>
                <Th>City</Th>
                <Th>Source Code</Th>
                <Th>Campaign</Th>
                <Th isNumeric>Price</Th>
                <Th>Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analyticsData?.leadDetails?.slice(0, 100).map((lead, index) => (
                <Tr key={index}>
                  <Td>{lead.name}</Td>
                  <Td>{lead.state}</Td>
                  <Td>{lead.city}</Td>
                  <Td>
                    <SourceCodeBadge 
                      code={lead.sourceCode} 
                      quality={getQuality(lead.sourceCode)} 
                      onQualityChange={cycleQuality}
                      size="sm" 
                    />
                  </Td>
                  <Td>{lead.campaignName}</Td>
                  <Td isNumeric>${lead.price.toFixed(2)}</Td>
                  <Td>{new Date(lead.purchaseDate).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </AnalyticsCard>
    </VStack>
  );

  // Demographics Screen Component
  const DemographicsScreen = () => (
    <VStack spacing={6} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <MetricDisplay 
          label="Top Performing State" 
          value={analyticsData?.demographics?.[0]?._id || 'N/A'}
          icon={FaTrophy}
          colorScheme="green"
        />
        <MetricDisplay 
          label="States with SOLD Leads" 
          value={analyticsData?.demographics?.length || 0}
          icon={FaMapMarkerAlt}
          colorScheme="blue"
        />
        <MetricDisplay 
          label="Geographic Coverage" 
          value={`${((analyticsData?.demographics?.length || 0) / 50 * 100).toFixed(0)}%`}
          icon={FaChartBar}
          colorScheme="purple"
        />
      </SimpleGrid>
      
      <AnalyticsCard title="State Performance Rankings" isLoading={analyticsLoading}>
        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Rank</Th>
                <Th>State</Th>
                <Th isNumeric>SOLD Leads</Th>
                <Th isNumeric>Total Spent</Th>
                <Th isNumeric>Avg CPA</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analyticsData?.demographics?.slice(0, 25).map((state, index) => (
                <Tr key={index}>
                  <Td>{index + 1}</Td>
                  <Td>{state._id}</Td>
                  <Td isNumeric>{state.soldCount}</Td>
                  <Td isNumeric>${state.totalSpent.toFixed(2)}</Td>
                  <Td isNumeric>${state.avgCPA.toFixed(2)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </AnalyticsCard>
    </VStack>
  );

  if (isLoading) {
    return (
      <Box bg={bgColor} minHeight="100vh">
        <Container maxW="container.xl" py={6}>
          <VStack spacing={4}>
            <Spinner size="xl" color="orange.500" />
            <Text>Loading analytics dashboard...</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box bg={bgColor} minHeight="100vh">
        <Container maxW="container.xl" py={6}>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <VStack align="start">
              <Text>{error}</Text>
              <Button size="sm" onClick={refreshStats}>Try Again</Button>
            </VStack>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg={bgColor} minHeight="100vh">
      <Container maxW="container.xl" py={6}>
        {/* Header with Time Period Selector */}
        <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <Heading size="lg">📊 Sales Analytics Dashboard</Heading>
          <Select 
            value={timePeriod} 
            onChange={(e) => setTimePeriod(e.target.value)} 
            w="200px"
            bg="white"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="all-time">All Time</option>
          </Select>
        </Flex>
        
        {/* Tab Navigation */}
        <Tabs 
          index={activeTab} 
          onChange={setActiveTab} 
          variant="enclosed" 
          colorScheme="orange"
        >
          <TabList mb={6} flexWrap="wrap">
            <Tab>📊 Source Code</Tab>
            <Tab>💰 CPA</Tab>
            <Tab>🎯 Campaign</Tab>
            <Tab>📋 Lead Details</Tab>
            <Tab>🗺️ Demographics</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel p={0}>
              <SourceCodeScreen />
            </TabPanel>
            <TabPanel p={0}>
              <CPAScreen />
            </TabPanel>
            <TabPanel p={0}>
              <CampaignScreen />
            </TabPanel>
            <TabPanel p={0}>
              <LeadDetailsScreen />
            </TabPanel>
            <TabPanel p={0}>
              <DemographicsScreen />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
};

export default Stats; 