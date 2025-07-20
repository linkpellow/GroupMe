import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import axiosInstance from '../api/axiosInstance';

export type QualityType = 'quality' | 'low-quality' | null;

interface QualityMap {
  [sourceCode: string]: QualityType;
}

interface QualityCounts {
  quality: number;
  'low-quality': number;
  total: number;
}

export const useSourceCodeQuality = () => {
  const [qualityMap, setQualityMap] = useState<QualityMap>({});
  const [qualityCounts, setQualityCounts] = useState<QualityCounts>({
    quality: 0,
    'low-quality': 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Fetch quality assignments from API
  const fetchQualityAssignments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/source-code-quality');
      if (response.data.success) {
        setQualityMap(response.data.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch quality assignments';
      setError(errorMessage);
      console.error('Error fetching quality assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch quality counts
  const fetchQualityCounts = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/source-code-quality/counts');
      if (response.data.success) {
        setQualityCounts(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching quality counts:', err);
    }
  }, []);

  // Set quality assignment
  const setQualityAssignment = useCallback(async (sourceCode: string, quality: QualityType) => {
    if (!quality) {
      // Remove assignment
      try {
        await axiosInstance.delete(`/source-code-quality/${encodeURIComponent(sourceCode)}`);
        setQualityMap(prev => {
          const updated = { ...prev };
          delete updated[sourceCode];
          return updated;
        });
        
        toast({
          title: 'Quality Removed',
          description: `Quality assignment removed for ${sourceCode}`,
          status: 'info',
          duration: 2000,
          isClosable: true,
        });
        
        // Refresh counts
        await fetchQualityCounts();
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to remove quality assignment';
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
      return;
    }

    try {
      const response = await axiosInstance.post('/source-code-quality', {
        sourceCode,
        quality
      });
      
      if (response.data.success) {
        // Update local state optimistically
        setQualityMap(prev => ({
          ...prev,
          [sourceCode]: quality
        }));

        const qualityLabel = quality === 'quality' ? 'Quality' : 'Low Quality';
        toast({
          title: 'Quality Updated',
          description: `${sourceCode} marked as ${qualityLabel}`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });

        // Refresh counts
        await fetchQualityCounts();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to set quality assignment';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [toast, fetchQualityCounts]);

  // Get quality for a source code
  const getQuality = useCallback((sourceCode: string): QualityType => {
    return qualityMap[sourceCode] || null;
  }, [qualityMap]);

  // Cycle through quality states (unassigned -> quality -> low-quality -> unassigned)
  const cycleQuality = useCallback((sourceCode: string) => {
    const current = getQuality(sourceCode);
    let next: QualityType;
    
    if (current === null) {
      next = 'quality';
    } else if (current === 'quality') {
      next = 'low-quality';
    } else {
      next = null; // Remove assignment
    }
    
    setQualityAssignment(sourceCode, next);
  }, [getQuality, setQualityAssignment]);

  // Get color scheme for quality
  const getQualityColorScheme = useCallback((quality: QualityType) => {
    switch (quality) {
      case 'quality':
        return 'green';
      case 'low-quality':
        return 'red';
      default:
        return 'purple'; // Default unassigned color
    }
  }, []);

  // Get quality label
  const getQualityLabel = useCallback((quality: QualityType) => {
    switch (quality) {
      case 'quality':
        return 'Quality';
      case 'low-quality':
        return 'Low Quality';
      default:
        return null;
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchQualityAssignments();
    fetchQualityCounts();
  }, [fetchQualityAssignments, fetchQualityCounts]);

  return {
    qualityMap,
    qualityCounts,
    isLoading,
    error,
    fetchQualityAssignments,
    fetchQualityCounts,
    setQualityAssignment,
    getQuality,
    cycleQuality,
    getQualityColorScheme,
    getQualityLabel,
  };
}; 