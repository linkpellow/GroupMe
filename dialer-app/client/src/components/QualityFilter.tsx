import React from 'react';
import {
  Select,
  HStack,
  Text,
  Badge,
  Box,
  Tooltip
} from '@chakra-ui/react';
import { FaFilter } from 'react-icons/fa';

export type QualityFilter = 'all' | 'quality' | 'low-quality' | 'unassigned';

interface QualityFilterProps {
  value: QualityFilter;
  onChange: (filter: QualityFilter) => void;
  counts: {
    total: number;
    quality: number;
    'low-quality': number;
    unassigned: number;
  };
  isLoading?: boolean;
}

const QualityFilter: React.FC<QualityFilterProps> = ({
  value,
  onChange,
  counts,
  isLoading = false
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as QualityFilter);
  };

  const getFilterLabel = (filter: QualityFilter) => {
    switch (filter) {
      case 'all':
        return `All (${counts.total})`;
      case 'quality':
        return `Quality (${counts.quality})`;
      case 'low-quality':
        return `Low Quality (${counts['low-quality']})`;
      case 'unassigned':
        return `Unassigned (${counts.unassigned})`;
      default:
        return 'All';
    }
  };

  return (
    <Box>
      <HStack spacing={2} mb={2}>
        <FaFilter color="#805AD5" />
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          Source Codes
        </Text>
        <Tooltip
          label="Filter source codes by quality assignment. Click on badges to assign quality."
          hasArrow
          placement="top"
        >
          <Badge colorScheme="purple" variant="outline" fontSize="xs">
            ?
          </Badge>
        </Tooltip>
      </HStack>
      
      <Select
        value={value}
        onChange={handleChange}
        disabled={isLoading}
        size="sm"
        bg="white"
        borderColor="purple.200"
        _hover={{ borderColor: 'purple.300' }}
        _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px #805AD5' }}
      >
        <option value="all">{getFilterLabel('all')}</option>
        <option value="quality">{getFilterLabel('quality')}</option>
        <option value="low-quality">{getFilterLabel('low-quality')}</option>
        <option value="unassigned">{getFilterLabel('unassigned')}</option>
      </Select>
    </Box>
  );
};

export default QualityFilter; 