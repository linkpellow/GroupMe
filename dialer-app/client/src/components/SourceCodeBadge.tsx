import React from 'react';
import { Badge, Tooltip, HStack, Icon, Box } from '@chakra-ui/react';
import { FaCheck, FaTimes, FaQuestion } from 'react-icons/fa';
import { QualityType } from '../hooks/useSourceCodeQuality';

interface SourceCodeBadgeProps {
  code: string;
  quality: QualityType;
  onQualityChange: (sourceCode: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  isClickable?: boolean;
}

const SourceCodeBadge: React.FC<SourceCodeBadgeProps> = ({
  code,
  quality,
  onQualityChange,
  size = 'md',
  showIcon = true,
  isClickable = true
}) => {
  const getColorScheme = () => {
    switch (quality) {
      case 'quality':
        return 'green';
      case 'low-quality':
        return 'red';
      default:
        return 'purple';
    }
  };

  const getIcon = () => {
    switch (quality) {
      case 'quality':
        return FaCheck;
      case 'low-quality':
        return FaTimes;
      default:
        return FaQuestion;
    }
  };

  const getTooltipText = () => {
    const baseText = `Source Code: ${code}`;
    switch (quality) {
      case 'quality':
        return `${baseText} (Quality) - Click to change to Low Quality`;
      case 'low-quality':
        return `${baseText} (Low Quality) - Click to remove assignment`;
      default:
        return `${baseText} (Unassigned) - Click to mark as Quality`;
    }
  };

  const getVariant = () => {
    return quality ? 'solid' : 'outline';
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isClickable) {
      onQualityChange(code);
    }
  };

  const badge = (
    <Badge
      colorScheme={getColorScheme()}
      variant={getVariant()}
      size={size}
      cursor={isClickable ? 'pointer' : 'default'}
      onClick={handleClick}
      transition="all 0.2s"
      _hover={isClickable ? {
        transform: 'scale(1.05)',
        boxShadow: 'md'
      } : undefined}
      _active={isClickable ? {
        transform: 'scale(0.95)'
      } : undefined}
      px={2}
      py={1}
      borderRadius="md"
      fontWeight="medium"
    >
      <HStack spacing={1} align="center">
        {showIcon && (
          <Icon
            as={getIcon()}
            w={3}
            h={3}
            color={quality ? 'white' : 'currentColor'}
          />
        )}
        <Box as="span">
          {code}
        </Box>
      </HStack>
    </Badge>
  );

  if (!isClickable) {
    return badge;
  }

  return (
    <Tooltip
      label={getTooltipText()}
      hasArrow
      placement="top"
      openDelay={500}
    >
      {badge}
    </Tooltip>
  );
};

export default SourceCodeBadge; 