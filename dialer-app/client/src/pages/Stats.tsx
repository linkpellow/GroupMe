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
  Card,
  CardBody,
  CardHeader,
  Progress,
  IconButton,
} from '@chakra-ui/react';
import { 
  FaChartBar, 
  FaMapMarkerAlt, 
  FaDollarSign, 
  FaHashtag, 
  FaBuilding, 
  FaTrophy, 
  FaUserCheck, 
  FaCalculator, 
  FaArrowUp,
  FaGamepad,
  FaRocket,
  FaBullseye,
  FaUsers,
  FaGlobe,
  FaFire,
  FaStar,
  FaGem,
  FaCrown,
  FaLightbulb
} from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { 
  BarChart, 
  Bar as RechartsBar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line as RechartsLine,
  AreaChart,
  Area
} from 'recharts';
import axiosInstance from '../api/axiosInstance';
import { useSourceCodeQuality } from '../hooks/useSourceCodeQuality';
import SourceCodeBadge from '../components/SourceCodeBadge';
import QualityFilter, { QualityFilter as QualityFilterType } from '../components/QualityFilter';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface FilterOptions {
  states: string[];
  dispositions: string[];
  sources: string[];
}

interface StatsData {
  totalLeads: number;
  totalSoldLeads: number;
  conversionRate: number;
  avgLeadValue: number;
  topStates: Array<{ state: string; count: number; percentage: number }>;
  topDispositions: Array<{ disposition: string; count: number; percentage: number; color: string }>;
  topSources: Array<{ source: string; count: number; percentage: number }>;
  recentActivity: Array<{
    date: string;
    leads: number;
    sold: number;
    conversionRate: number;
  }>;
}

interface AnalyticsData {
  sourceCodes: Array<{
    code: string;
    totalLeads: number;
    soldLeads: number;
    conversionRate: number;
    revenue: number;
    avgCost: number;
  }>;
  campaigns: Array<{
    name: string;
    leads: number;
    sold: number;
    cost: number;
    revenue: number;
    roi: number;
  }>;
  demographics: Array<{
    state: string;
    count: number;
    revenue: number;
    avgAge: number;
  }>;
  timeline: Array<{
    date: string;
    leads: number;
    sold: number;
    revenue: number;
  }>;
}

// Game-like color palette
const GAME_COLORS = {
  primary: '#FF8C00',    // Orange
  secondary: '#EFBF04',  // Gold
  success: '#00FF7F',    // Spring Green
  warning: '#FFD700',    // Gold
  danger: '#FF4444',     // Red
  info: '#00BFFF',       // Deep Sky Blue
  purple: '#9932CC',     // Dark Orchid
  cyan: '#00FFFF',       // Cyan
  pink: '#FF69B4',       // Hot Pink
  lime: '#32CD32',       // Lime Green
};

const CHART_COLORS = [
  GAME_COLORS.primary,
  GAME_COLORS.secondary,
  GAME_COLORS.success,
  GAME_COLORS.info,
  GAME_COLORS.purple,
  GAME_COLORS.cyan,
  GAME_COLORS.pink,
  GAME_COLORS.lime,
  GAME_COLORS.warning,
  GAME_COLORS.danger,
];

const Stats: React.FC = () => {
  const toast = useToast();
  
  // State for existing functionality
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<QualityFilterType>('all');

  // State for new analytics dashboard
  const [activeTab, setActiveTab] = useState(0);
  const [timePeriod, setTimePeriod] = useState('monthly');
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

  // Theme colors with game-like styling
  const bgColor = useColorModeValue('#f5f2e9', 'rgba(26, 32, 44, 0.95)');
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(45, 55, 72, 0.85)');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)');

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

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [sourceCodesRes, cpaRes, campaignRes, leadDetailsRes, demographicsRes] = await Promise.all([
        axiosInstance.get('/analytics/sold/source-codes', { params: { timePeriod } }),
        axiosInstance.get('/analytics/sold/cpa', { params: { timePeriod } }),
        axiosInstance.get('/analytics/sold/campaign-performance', { params: { timePeriod } }),
        axiosInstance.get('/analytics/sold/lead-details', { params: { timePeriod } }),
        axiosInstance.get('/analytics/sold/demographics', { params: { timePeriod } })
      ]);

      const mockTimeline = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        leads: Math.floor(Math.random() * 100) + 50,
        sold: Math.floor(Math.random() * 20) + 5,
        revenue: Math.floor(Math.random() * 5000) + 1000,
      })).reverse();

      setAnalyticsData({
        sourceCodes: sourceCodesRes.data?.data || [],
        campaigns: campaignRes.data?.data || [],
        demographics: demographicsRes.data?.data || [],
        timeline: mockTimeline,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      toast({
        title: 'Analytics Error',
        description: 'Failed to load analytics data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [timePeriod, toast]);

  useEffect(() => {
    refreshStats();
    fetchAnalyticsData();
  }, [refreshStats, fetchAnalyticsData]);

  // Chart configurations with 3D-like effects
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Tektur, monospace',
            weight: 'bold' as const,
          },
          color: textColor === 'white' ? '#ffffff' : '#2d3748',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: GAME_COLORS.primary,
        borderWidth: 2,
        cornerRadius: 8,
        titleFont: {
          family: 'Tektur, monospace',
          weight: 'bold' as const,
        },
        bodyFont: {
          family: 'Tektur, monospace',
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 140, 0, 0.1)',
        },
        ticks: {
          color: textColor === 'white' ? '#ffffff' : '#2d3748',
          font: {
            family: 'Tektur, monospace',
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 140, 0, 0.1)',
        },
        ticks: {
          color: textColor === 'white' ? '#ffffff' : '#2d3748',
          font: {
            family: 'Tektur, monospace',
          },
        },
      },
    },
  };

  // Source Code Analytics Screen
  const SourceCodeScreen = () => {
    const sourceData = analyticsData?.sourceCodes || [];
    
    const barData = {
      labels: sourceData.slice(0, 10).map(item => item.code),
      datasets: [
        {
          label: 'Total Leads',
          data: sourceData.slice(0, 10).map(item => item.totalLeads),
          backgroundColor: GAME_COLORS.primary + '80',
          borderColor: GAME_COLORS.primary,
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'SOLD Leads',
          data: sourceData.slice(0, 10).map(item => item.soldLeads),
          backgroundColor: GAME_COLORS.success + '80',
          borderColor: GAME_COLORS.success,
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        }
      ],
    };

    return (
      <VStack spacing={6} align="stretch">
        {/* Header with Game-like Stats */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.primary} borderRadius="12px" 
                boxShadow="0 8px 16px rgba(255, 140, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaRocket color={GAME_COLORS.primary} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  ACTIVE SOURCES
                </StatLabel>
                <StatNumber color={GAME_COLORS.primary} fontFamily="Tektur, monospace" fontSize="2xl">
                  {sourceData.length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.success} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 255, 127, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaTrophy color={GAME_COLORS.success} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOP PERFORMER
                </StatLabel>
                <StatNumber color={GAME_COLORS.success} fontFamily="Tektur, monospace" fontSize="xl">
                  {sourceData[0]?.code || 'N/A'}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.secondary} borderRadius="12px"
                boxShadow="0 8px 16px rgba(239, 191, 4, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaGem color={GAME_COLORS.secondary} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  AVG CONVERSION
                </StatLabel>
                <StatNumber color={GAME_COLORS.secondary} fontFamily="Tektur, monospace" fontSize="2xl">
                  {sourceData.length > 0 ? 
                    (sourceData.reduce((acc, item) => acc + item.conversionRate, 0) / sourceData.length).toFixed(1) + '%'
                    : '0%'
                  }
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.info} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 191, 255, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaFire color={GAME_COLORS.info} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOTAL REVENUE
                </StatLabel>
                <StatNumber color={GAME_COLORS.info} fontFamily="Tektur, monospace" fontSize="2xl">
                  ${sourceData.reduce((acc, item) => acc + (item.revenue || 0), 0).toLocaleString()}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Main Chart */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px"
              boxShadow="0 8px 24px rgba(0, 0, 0, 0.1)">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaChartBar color={GAME_COLORS.primary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                Source Code Performance Arena
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height="400px">
              <Bar data={barData} options={chartOptions} />
            </Box>
          </CardBody>
        </Card>

        {/* Detailed Table */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaGamepad color={GAME_COLORS.secondary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                Leaderboard
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg={GAME_COLORS.primary + '20'}>
                    <Th fontFamily="Tektur, monospace" color={textColor}>RANK</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>SOURCE CODE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>LEADS</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>SOLD</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>CONVERSION</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>REVENUE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>QUALITY</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sourceData.slice(0, 15).map((item, index) => (
                    <Tr key={item.code} _hover={{ bg: GAME_COLORS.primary + '10' }}>
                      <Td fontFamily="Tektur, monospace" fontWeight="bold">
                        {index + 1 <= 3 ? (
                          <Flex align="center" gap={2}>
                            {index === 0 && <FaCrown color={GAME_COLORS.secondary} />}
                            {index === 1 && <FaStar color="#C0C0C0" />}
                            {index === 2 && <FaGem color="#CD7F32" />}
                            #{index + 1}
                          </Flex>
                        ) : (
                          `#${index + 1}`
                        )}
                      </Td>
                      <Td fontFamily="Tektur, monospace" fontWeight="bold" color={GAME_COLORS.primary}>
                        {item.code}
                      </Td>
                      <Td fontFamily="Tektur, monospace">{item.totalLeads}</Td>
                      <Td fontFamily="Tektur, monospace" color={GAME_COLORS.success} fontWeight="bold">
                        {item.soldLeads}
                      </Td>
                      <Td>
                        <Progress 
                          value={item.conversionRate} 
                          colorScheme="orange" 
                          size="sm" 
                          borderRadius="full"
                          bg="gray.200"
                        />
                        <Text fontSize="xs" fontFamily="Tektur, monospace" mt={1}>
                          {item.conversionRate.toFixed(1)}%
                        </Text>
                      </Td>
                      <Td fontFamily="Tektur, monospace" color={GAME_COLORS.info} fontWeight="bold">
                        ${(item.revenue || 0).toLocaleString()}
                      </Td>
                      <Td>
                        <SourceCodeBadge 
                          code={item.code}
                          size="sm"
                          quality={getQuality(item.code)}
                          onQualityChange={(newQuality) => cycleQuality(item.code)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  // CPA Analytics Screen
  const CPAScreen = () => {
    const sourceData = analyticsData?.sourceCodes || [];
    
    const cpaData = sourceData.map(item => ({
      code: item.code,
      cpa: item.avgCost || 0,
      revenue: item.revenue || 0,
      roi: item.revenue > 0 ? ((item.revenue - item.avgCost) / item.avgCost) * 100 : 0,
    })).sort((a, b) => a.cpa - b.cpa);

    const doughnutData = {
      labels: cpaData.slice(0, 8).map(item => item.code),
      datasets: [
        {
          label: 'Cost Per Acquisition',
          data: cpaData.slice(0, 8).map(item => item.cpa),
          backgroundColor: CHART_COLORS.slice(0, 8).map(color => color + '80'),
          borderColor: CHART_COLORS.slice(0, 8),
          borderWidth: 3,
          hoverBorderWidth: 5,
          cutout: '40%',
        },
      ],
    };

    return (
      <VStack spacing={6} align="stretch">
        {/* CPA Overview Cards */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.primary} borderRadius="12px" 
                boxShadow="0 8px 16px rgba(255, 140, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaDollarSign color={GAME_COLORS.primary} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  AVG CPA
                </StatLabel>
                <StatNumber color={GAME_COLORS.primary} fontFamily="Tektur, monospace" fontSize="2xl">
                  ${cpaData.length > 0 ? 
                    (cpaData.reduce((acc, item) => acc + item.cpa, 0) / cpaData.length).toFixed(2)
                    : '0.00'
                  }
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.success} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 255, 127, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaBullseye color={GAME_COLORS.success} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  BEST CPA
                </StatLabel>
                <StatNumber color={GAME_COLORS.success} fontFamily="Tektur, monospace" fontSize="2xl">
                  ${cpaData[0]?.cpa.toFixed(2) || '0.00'}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.warning} borderRadius="12px"
                boxShadow="0 8px 16px rgba(255, 215, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaCalculator color={GAME_COLORS.warning} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  AVG ROI
                </StatLabel>
                <StatNumber color={GAME_COLORS.warning} fontFamily="Tektur, monospace" fontSize="2xl">
                  {cpaData.length > 0 ? 
                    (cpaData.reduce((acc, item) => acc + item.roi, 0) / cpaData.length).toFixed(1) + '%'
                    : '0%'
                  }
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.info} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 191, 255, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaLightbulb color={GAME_COLORS.info} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  EFFICIENCY
                </StatLabel>
                <StatNumber color={GAME_COLORS.info} fontFamily="Tektur, monospace" fontSize="2xl">
                  {cpaData.filter(item => item.roi > 100).length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* 3D-like Doughnut Chart */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px"
              boxShadow="0 8px 24px rgba(0, 0, 0, 0.1)">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaDollarSign color={GAME_COLORS.primary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                Cost Distribution Matrix
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height="400px" display="flex" justifyContent="center" alignItems="center">
              <Box width="400px" height="400px">
                <Doughnut data={doughnutData} options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'right' as const,
                      labels: {
                        font: {
                          family: 'Tektur, monospace',
                          weight: 'bold' as const,
                        },
                        color: textColor === 'white' ? '#ffffff' : '#2d3748',
                      },
                    },
                  },
                }} />
              </Box>
            </Box>
          </CardBody>
        </Card>

        {/* ROI Leaderboard */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaTrophy color={GAME_COLORS.secondary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                ROI Champions
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg={GAME_COLORS.primary + '20'}>
                    <Th fontFamily="Tektur, monospace" color={textColor}>RANK</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>SOURCE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>CPA</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>REVENUE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>ROI</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>STATUS</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {cpaData.sort((a, b) => b.roi - a.roi).slice(0, 10).map((item, index) => (
                    <Tr key={item.code} _hover={{ bg: GAME_COLORS.primary + '10' }}>
                      <Td fontFamily="Tektur, monospace" fontWeight="bold">
                        {index + 1 <= 3 ? (
                          <Flex align="center" gap={2}>
                            {index === 0 && <FaCrown color={GAME_COLORS.secondary} />}
                            {index === 1 && <FaStar color="#C0C0C0" />}
                            {index === 2 && <FaGem color="#CD7F32" />}
                            #{index + 1}
                          </Flex>
                        ) : (
                          `#${index + 1}`
                        )}
                      </Td>
                      <Td fontFamily="Tektur, monospace" fontWeight="bold" color={GAME_COLORS.primary}>
                        {item.code}
                      </Td>
                      <Td fontFamily="Tektur, monospace">${item.cpa.toFixed(2)}</Td>
                      <Td fontFamily="Tektur, monospace" color={GAME_COLORS.info} fontWeight="bold">
                        ${item.revenue.toLocaleString()}
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={item.roi > 200 ? 'green' : item.roi > 100 ? 'yellow' : 'red'}
                          fontFamily="Tektur, monospace"
                          fontSize="xs"
                        >
                          {item.roi.toFixed(1)}%
                        </Badge>
                      </Td>
                      <Td>
                        {item.roi > 200 ? (
                          <Flex align="center" gap={1} color={GAME_COLORS.success}>
                            <FaFire /> <Text fontSize="xs" fontFamily="Tektur, monospace">HOT</Text>
                          </Flex>
                        ) : item.roi > 100 ? (
                          <Flex align="center" gap={1} color={GAME_COLORS.warning}>
                            <FaArrowUp /> <Text fontSize="xs" fontFamily="Tektur, monospace">GOOD</Text>
                          </Flex>
                        ) : (
                          <Text fontSize="xs" fontFamily="Tektur, monospace" color="red.500">NEEDS WORK</Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  // Campaign Performance Screen
  const CampaignScreen = () => {
    const campaigns = analyticsData?.campaigns || [];
    
    const barData = {
      labels: campaigns.slice(0, 8).map(item => item.name.substring(0, 10) + '...'),
      datasets: [
        {
          label: 'Leads',
          data: campaigns.slice(0, 8).map(item => item.leads),
          backgroundColor: GAME_COLORS.info + '80',
          borderColor: GAME_COLORS.info,
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Revenue',
          data: campaigns.slice(0, 8).map(item => item.revenue),
          backgroundColor: GAME_COLORS.success + '80',
          borderColor: GAME_COLORS.success,
          borderWidth: 2,
          yAxisID: 'y1',
        }
      ],
    };

    const campaignChartOptions = {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Leads',
            color: textColor === 'white' ? '#ffffff' : '#2d3748',
            font: {
              family: 'Tektur, monospace',
            },
          },
        },
        y1: {
          ...chartOptions.scales.y,
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Revenue ($)',
            color: textColor === 'white' ? '#ffffff' : '#2d3748',
            font: {
              family: 'Tektur, monospace',
            },
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    };

    return (
      <VStack spacing={6} align="stretch">
        {/* Campaign Overview */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.primary} borderRadius="12px" 
                boxShadow="0 8px 16px rgba(255, 140, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaBuilding color={GAME_COLORS.primary} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  ACTIVE CAMPAIGNS
                </StatLabel>
                <StatNumber color={GAME_COLORS.primary} fontFamily="Tektur, monospace" fontSize="2xl">
                  {campaigns.length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.success} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 255, 127, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaUsers color={GAME_COLORS.success} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOTAL LEADS
                </StatLabel>
                <StatNumber color={GAME_COLORS.success} fontFamily="Tektur, monospace" fontSize="2xl">
                  {campaigns.reduce((acc, item) => acc + item.leads, 0)}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.info} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 191, 255, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaDollarSign color={GAME_COLORS.info} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOTAL REVENUE
                </StatLabel>
                <StatNumber color={GAME_COLORS.info} fontFamily="Tektur, monospace" fontSize="2xl">
                  ${campaigns.reduce((acc, item) => acc + item.revenue, 0).toLocaleString()}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.warning} borderRadius="12px"
                boxShadow="0 8px 16px rgba(255, 215, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaRocket color={GAME_COLORS.warning} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  AVG ROI
                </StatLabel>
                <StatNumber color={GAME_COLORS.warning} fontFamily="Tektur, monospace" fontSize="2xl">
                  {campaigns.length > 0 ? 
                    (campaigns.reduce((acc, item) => acc + item.roi, 0) / campaigns.length).toFixed(1) + '%'
                    : '0%'
                  }
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Dual Axis Chart */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px"
              boxShadow="0 8px 24px rgba(0, 0, 0, 0.1)">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaRocket color={GAME_COLORS.primary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                Campaign Battle Arena
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height="400px">
              <Bar data={barData} options={campaignChartOptions} />
            </Box>
          </CardBody>
        </Card>

        {/* Campaign Leaderboard */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaTrophy color={GAME_COLORS.secondary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                Campaign Rankings
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg={GAME_COLORS.primary + '20'}>
                    <Th fontFamily="Tektur, monospace" color={textColor}>RANK</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>CAMPAIGN</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>LEADS</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>SOLD</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>COST</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>REVENUE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>ROI</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>STATUS</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {campaigns.sort((a, b) => b.roi - a.roi).slice(0, 10).map((item, index) => (
                    <Tr key={item.name} _hover={{ bg: GAME_COLORS.primary + '10' }}>
                      <Td fontFamily="Tektur, monospace" fontWeight="bold">
                        {index + 1 <= 3 ? (
                          <Flex align="center" gap={2}>
                            {index === 0 && <FaCrown color={GAME_COLORS.secondary} />}
                            {index === 1 && <FaStar color="#C0C0C0" />}
                            {index === 2 && <FaGem color="#CD7F32" />}
                            #{index + 1}
                          </Flex>
                        ) : (
                          `#${index + 1}`
                        )}
                      </Td>
                      <Td fontFamily="Tektur, monospace" fontWeight="bold" color={GAME_COLORS.primary}>
                        {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
                      </Td>
                      <Td fontFamily="Tektur, monospace">{item.leads}</Td>
                      <Td fontFamily="Tektur, monospace" color={GAME_COLORS.success} fontWeight="bold">
                        {item.sold}
                      </Td>
                      <Td fontFamily="Tektur, monospace">${item.cost.toLocaleString()}</Td>
                      <Td fontFamily="Tektur, monospace" color={GAME_COLORS.info} fontWeight="bold">
                        ${item.revenue.toLocaleString()}
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={item.roi > 200 ? 'green' : item.roi > 100 ? 'yellow' : 'red'}
                          fontFamily="Tektur, monospace"
                          fontSize="xs"
                        >
                          {item.roi.toFixed(1)}%
                        </Badge>
                      </Td>
                      <Td>
                        {item.roi > 200 ? (
                          <Flex align="center" gap={1} color={GAME_COLORS.success}>
                            <FaFire /> <Text fontSize="xs" fontFamily="Tektur, monospace">BLAZING</Text>
                          </Flex>
                        ) : item.roi > 100 ? (
                          <Flex align="center" gap={1} color={GAME_COLORS.warning}>
                            <FaArrowUp /> <Text fontSize="xs" fontFamily="Tektur, monospace">RISING</Text>
                          </Flex>
                        ) : (
                          <Text fontSize="xs" fontFamily="Tektur, monospace" color="red.500">OPTIMIZE</Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  // Lead Details Screen
  const LeadDetailsScreen = () => {
    const timeline = analyticsData?.timeline || [];
    
    const lineData = {
      labels: timeline.slice(-14).map(item => new Date(item.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Leads Generated',
          data: timeline.slice(-14).map(item => item.leads),
          borderColor: GAME_COLORS.primary,
          backgroundColor: GAME_COLORS.primary + '20',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: GAME_COLORS.primary,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        {
          label: 'SOLD Leads',
          data: timeline.slice(-14).map(item => item.sold),
          borderColor: GAME_COLORS.success,
          backgroundColor: GAME_COLORS.success + '20',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: GAME_COLORS.success,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        }
      ],
    };

    return (
      <VStack spacing={6} align="stretch">
        {/* Lead Overview */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.primary} borderRadius="12px" 
                boxShadow="0 8px 16px rgba(255, 140, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaUsers color={GAME_COLORS.primary} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOTAL LEADS
                </StatLabel>
                <StatNumber color={GAME_COLORS.primary} fontFamily="Tektur, monospace" fontSize="2xl">
                  {timeline.reduce((acc, item) => acc + item.leads, 0)}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.success} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 255, 127, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaUserCheck color={GAME_COLORS.success} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOTAL SOLD
                </StatLabel>
                <StatNumber color={GAME_COLORS.success} fontFamily="Tektur, monospace" fontSize="2xl">
                  {timeline.reduce((acc, item) => acc + item.sold, 0)}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.info} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 191, 255, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaBullseye color={GAME_COLORS.info} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  CONVERSION RATE
                </StatLabel>
                <StatNumber color={GAME_COLORS.info} fontFamily="Tektur, monospace" fontSize="2xl">
                  {timeline.length > 0 ? 
                    ((timeline.reduce((acc, item) => acc + item.sold, 0) / 
                      timeline.reduce((acc, item) => acc + item.leads, 0)) * 100).toFixed(1) + '%'
                    : '0%'
                  }
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.warning} borderRadius="12px"
                boxShadow="0 8px 16px rgba(255, 215, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaDollarSign color={GAME_COLORS.warning} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOTAL REVENUE
                </StatLabel>
                <StatNumber color={GAME_COLORS.warning} fontFamily="Tektur, monospace" fontSize="2xl">
                  ${timeline.reduce((acc, item) => acc + item.revenue, 0).toLocaleString()}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Timeline Chart */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px"
              boxShadow="0 8px 24px rgba(0, 0, 0, 0.1)">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaChartBar color={GAME_COLORS.primary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                Performance Timeline
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height="400px">
              <Line data={lineData} options={chartOptions} />
            </Box>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaFire color={GAME_COLORS.secondary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                Recent Activity Log
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg={GAME_COLORS.primary + '20'}>
                    <Th fontFamily="Tektur, monospace" color={textColor}>DATE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>LEADS</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>SOLD</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>CONVERSION</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>REVENUE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>TREND</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {timeline.slice(-10).reverse().map((item, index) => {
                    const prevItem = timeline[timeline.length - 10 + index - 1];
                    const conversionRate = (item.sold / item.leads) * 100;
                    const prevConversionRate = prevItem ? (prevItem.sold / prevItem.leads) * 100 : 0;
                    const trend = conversionRate > prevConversionRate ? 'up' : conversionRate < prevConversionRate ? 'down' : 'stable';
                    
                    return (
                      <Tr key={item.date} _hover={{ bg: GAME_COLORS.primary + '10' }}>
                        <Td fontFamily="Tektur, monospace" fontWeight="bold">
                          {new Date(item.date).toLocaleDateString()}
                        </Td>
                        <Td fontFamily="Tektur, monospace">{item.leads}</Td>
                        <Td fontFamily="Tektur, monospace" color={GAME_COLORS.success} fontWeight="bold">
                          {item.sold}
                        </Td>
                        <Td>
                          <Badge 
                            colorScheme={conversionRate > 15 ? 'green' : conversionRate > 10 ? 'yellow' : 'red'}
                            fontFamily="Tektur, monospace"
                            fontSize="xs"
                          >
                            {conversionRate.toFixed(1)}%
                          </Badge>
                        </Td>
                        <Td fontFamily="Tektur, monospace" color={GAME_COLORS.info} fontWeight="bold">
                          ${item.revenue.toLocaleString()}
                        </Td>
                        <Td>
                          {trend === 'up' ? (
                            <FaArrowUp color={GAME_COLORS.success} />
                          ) : trend === 'down' ? (
                            <Text color="red.500" fontSize="lg">↓</Text>
                          ) : (
                            <Text color="gray.500" fontSize="lg">→</Text>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  // Demographics Screen
  const DemographicsScreen = () => {
    const demographics = analyticsData?.demographics || [];
    
    const mapData = demographics.map((item, index) => ({
      ...item,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

    return (
      <VStack spacing={6} align="stretch">
        {/* Geographic Overview */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.primary} borderRadius="12px" 
                boxShadow="0 8px 16px rgba(255, 140, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaGlobe color={GAME_COLORS.primary} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  STATES ACTIVE
                </StatLabel>
                <StatNumber color={GAME_COLORS.primary} fontFamily="Tektur, monospace" fontSize="2xl">
                  {demographics.length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.success} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 255, 127, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaMapMarkerAlt color={GAME_COLORS.success} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOP STATE
                </StatLabel>
                <StatNumber color={GAME_COLORS.success} fontFamily="Tektur, monospace" fontSize="2xl">
                  {demographics[0]?.state || 'N/A'}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.info} borderRadius="12px"
                boxShadow="0 8px 16px rgba(0, 191, 255, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaUsers color={GAME_COLORS.info} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  AVG AGE
                </StatLabel>
                <StatNumber color={GAME_COLORS.info} fontFamily="Tektur, monospace" fontSize="2xl">
                  {demographics.length > 0 ? 
                    Math.round(demographics.reduce((acc, item) => acc + item.avgAge, 0) / demographics.length)
                    : 0
                  }
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} border="2px solid" borderColor={GAME_COLORS.warning} borderRadius="12px"
                boxShadow="0 8px 16px rgba(255, 215, 0, 0.2)">
            <CardBody textAlign="center">
              <Flex align="center" justify="center" mb={2}>
                <FaDollarSign color={GAME_COLORS.warning} size={24} />
              </Flex>
              <Stat>
                <StatLabel color={textColor} fontFamily="Tektur, monospace" fontSize="sm" fontWeight="bold">
                  TOTAL REVENUE
                </StatLabel>
                <StatNumber color={GAME_COLORS.warning} fontFamily="Tektur, monospace" fontSize="2xl">
                  ${demographics.reduce((acc, item) => acc + item.revenue, 0).toLocaleString()}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Geographic Distribution */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px"
              boxShadow="0 8px 24px rgba(0, 0, 0, 0.1)">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaMapMarkerAlt color={GAME_COLORS.primary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                Geographic Command Center
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height="400px">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 140, 0, 0.1)" />
                  <XAxis 
                    dataKey="state" 
                    tick={{ fill: textColor === 'white' ? '#ffffff' : '#2d3748', fontFamily: 'Tektur, monospace' }}
                  />
                  <YAxis 
                    tick={{ fill: textColor === 'white' ? '#ffffff' : '#2d3748', fontFamily: 'Tektur, monospace' }}
                  />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: `2px solid ${GAME_COLORS.primary}`,
                      borderRadius: '8px',
                      fontFamily: 'Tektur, monospace',
                    }}
                  />
                  <RechartsLegend />
                  <RechartsBar 
                    dataKey="count" 
                    fill={GAME_COLORS.primary} 
                    stroke={GAME_COLORS.primary}
                    strokeWidth={2}
                    name="Lead Count"
                    radius={[4, 4, 0, 0]}
                  />
                  <RechartsBar 
                    dataKey="revenue" 
                    fill={GAME_COLORS.success} 
                    stroke={GAME_COLORS.success}
                    strokeWidth={2}
                    name="Revenue"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        {/* State Rankings */}
        <Card bg={cardBg} border="2px solid" borderColor={borderColor} borderRadius="12px">
          <CardHeader>
            <Flex align="center" gap={3}>
              <FaTrophy color={GAME_COLORS.secondary} size={24} />
              <Heading size="md" fontFamily="Tektur, monospace" color={textColor}>
                State Leaderboard
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg={GAME_COLORS.primary + '20'}>
                    <Th fontFamily="Tektur, monospace" color={textColor}>RANK</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>STATE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>LEADS</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>REVENUE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>AVG AGE</Th>
                    <Th fontFamily="Tektur, monospace" color={textColor}>PERFORMANCE</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {demographics.sort((a, b) => b.count - a.count).slice(0, 15).map((item, index) => (
                    <Tr key={item.state} _hover={{ bg: GAME_COLORS.primary + '10' }}>
                      <Td fontFamily="Tektur, monospace" fontWeight="bold">
                        {index + 1 <= 3 ? (
                          <Flex align="center" gap={2}>
                            {index === 0 && <FaCrown color={GAME_COLORS.secondary} />}
                            {index === 1 && <FaStar color="#C0C0C0" />}
                            {index === 2 && <FaGem color="#CD7F32" />}
                            #{index + 1}
                          </Flex>
                        ) : (
                          `#${index + 1}`
                        )}
                      </Td>
                      <Td fontFamily="Tektur, monospace" fontWeight="bold" color={GAME_COLORS.primary}>
                        {item.state}
                      </Td>
                      <Td fontFamily="Tektur, monospace">{item.count}</Td>
                      <Td fontFamily="Tektur, monospace" color={GAME_COLORS.success} fontWeight="bold">
                        ${item.revenue.toLocaleString()}
                      </Td>
                      <Td fontFamily="Tektur, monospace">{Math.round(item.avgAge)}</Td>
                      <Td>
                        {item.count > 100 ? (
                          <Flex align="center" gap={1} color={GAME_COLORS.success}>
                            <FaFire /> <Text fontSize="xs" fontFamily="Tektur, monospace">HOT</Text>
                          </Flex>
                        ) : item.count > 50 ? (
                          <Flex align="center" gap={1} color={GAME_COLORS.warning}>
                            <FaArrowUp /> <Text fontSize="xs" fontFamily="Tektur, monospace">ACTIVE</Text>
                          </Flex>
                        ) : (
                          <Text fontSize="xs" fontFamily="Tektur, monospace" color="gray.500">GROWING</Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  if (isLoading) {
    return (
      <Box 
        minHeight="100vh" 
        bg={bgColor} 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color={GAME_COLORS.primary} thickness="4px" />
          <Text fontFamily="Tektur, monospace" fontSize="lg" color={textColor}>
            Loading Analytics Dashboard...
          </Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minHeight="100vh" bg={bgColor} p={8}>
        <Container maxW="container.xl">
          <Alert status="error" borderRadius="12px">
            <AlertIcon />
            <Text fontFamily="Tektur, monospace">{error}</Text>
            <Button 
              ml={4} 
              colorScheme="orange" 
              size="sm" 
              onClick={refreshStats}
              fontFamily="Tektur, monospace"
            >
              Retry
            </Button>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" bg={bgColor} py={6}>
      <Container maxW="container.xl" py={6}>
        {/* Header with Game-like Styling */}
        <Flex mb={8} justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <VStack align="start" spacing={2}>
            <Flex align="center" gap={3}>
              <FaGamepad color={GAME_COLORS.primary} size={32} />
              <Heading 
                size="xl" 
                fontFamily="Tektur, monospace" 
                color={textColor}
                textShadow="2px 2px 4px rgba(0,0,0,0.3)"
              >
                Analytics Command Center
              </Heading>
            </Flex>
            <Text color={textColor} fontFamily="Tektur, monospace" fontSize="sm">
              Real-time performance metrics and insights
            </Text>
          </VStack>
          
          <HStack spacing={4}>
            <Select 
              value={timePeriod} 
              onChange={(e) => setTimePeriod(e.target.value)} 
              w="200px"
              bg={cardBg}
              borderColor={GAME_COLORS.primary}
              borderWidth="2px"
              fontFamily="Tektur, monospace"
              fontWeight="bold"
              _focus={{
                borderColor: GAME_COLORS.secondary,
                boxShadow: `0 0 0 1px ${GAME_COLORS.secondary}`,
              }}
            >
              <option value="weekly">Weekly View</option>
              <option value="monthly">Monthly View</option>
              <option value="yearly">Yearly View</option>
              <option value="all-time">All Time</option>
            </Select>
            
            <IconButton
              aria-label="Refresh Data"
              icon={<FaArrowUp />}
              colorScheme="orange"
              variant="solid"
              onClick={fetchAnalyticsData}
              isLoading={analyticsLoading}
              size="md"
              borderRadius="8px"
              boxShadow="0 4px 8px rgba(255, 140, 0, 0.3)"
            />
          </HStack>
        </Flex>
        
        {/* Horizontal Tab Navigation with Game-like Styling */}
        <Tabs 
          index={activeTab} 
          onChange={setActiveTab} 
          variant="enclosed" 
          colorScheme="orange"
          size="lg"
        >
          <TabList 
            mb={8} 
            flexWrap="wrap" 
            bg={cardBg}
            borderRadius="12px"
            p={2}
            border="2px solid"
            borderColor={GAME_COLORS.primary}
            boxShadow="0 8px 16px rgba(255, 140, 0, 0.2)"
          >
            <Tab 
              fontFamily="Tektur, monospace" 
              fontWeight="bold"
              _selected={{ 
                bg: GAME_COLORS.primary, 
                color: 'white',
                borderRadius: '8px',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(255, 140, 0, 0.4)',
              }}
              _hover={{
                transform: 'translateY(-1px)',
              }}
              transition="all 0.2s ease"
            >
              <Flex align="center" gap={2}>
                <FaChartBar />
                Source Codes
              </Flex>
            </Tab>
            <Tab 
              fontFamily="Tektur, monospace" 
              fontWeight="bold"
              _selected={{ 
                bg: GAME_COLORS.primary, 
                color: 'white',
                borderRadius: '8px',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(255, 140, 0, 0.4)',
              }}
              _hover={{
                transform: 'translateY(-1px)',
              }}
              transition="all 0.2s ease"
            >
              <Flex align="center" gap={2}>
                <FaDollarSign />
                CPA Analysis
              </Flex>
            </Tab>
            <Tab 
              fontFamily="Tektur, monospace" 
              fontWeight="bold"
              _selected={{ 
                bg: GAME_COLORS.primary, 
                color: 'white',
                borderRadius: '8px',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(255, 140, 0, 0.4)',
              }}
              _hover={{
                transform: 'translateY(-1px)',
              }}
              transition="all 0.2s ease"
            >
              <Flex align="center" gap={2}>
                <FaRocket />
                Campaigns
              </Flex>
            </Tab>
            <Tab 
              fontFamily="Tektur, monospace" 
              fontWeight="bold"
              _selected={{ 
                bg: GAME_COLORS.primary, 
                color: 'white',
                borderRadius: '8px',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(255, 140, 0, 0.4)',
              }}
              _hover={{
                transform: 'translateY(-1px)',
              }}
              transition="all 0.2s ease"
            >
              <Flex align="center" gap={2}>
                <FaUsers />
                Lead Details
              </Flex>
            </Tab>
            <Tab 
              fontFamily="Tektur, monospace" 
              fontWeight="bold"
              _selected={{ 
                bg: GAME_COLORS.primary, 
                color: 'white',
                borderRadius: '8px',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(255, 140, 0, 0.4)',
              }}
              _hover={{
                transform: 'translateY(-1px)',
              }}
              transition="all 0.2s ease"
            >
              <Flex align="center" gap={2}>
                <FaGlobe />
                Demographics
              </Flex>
            </Tab>
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