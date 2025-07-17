import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  useToast,
  Text,
  Progress,
  HStack,
  Icon,
  Divider,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FaCloudUploadAlt, FaFileCsv, FaWrench, FaSyncAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useQueryClient } from '@tanstack/react-query';

const CsvUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isFixingDuplicates, setIsFixingDuplicates] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<unknown>(null);
  const [duplicateFixResult, setDuplicateFixResult] = useState<unknown>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
        setFile(droppedFile);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please drop a CSV file',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [toast]
  );

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Starting upload...');
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Use the vendor-aware import endpoint
      const response = await axiosInstance.('/csv-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total!) * 100;
          setUploadProgress(progress);
        },
      });

      console.log('Upload response:', response.data);

      // Check if the response has success status
      if (response.data.success && response.data.stats) {
        // Invalidate and refetch leads query
        await queryClient.invalidateQueries({ queryKey: ['leads'] });

        // Force a refetch of the leads data
        await queryClient.refetchQueries({ queryKey: ['leads'] });

        // Show detailed success message with vendor info
        toast({
          title: `${response.data.vendor} Import Successful`,
          description: `Imported ${response.data.stats.imported} leads, updated ${response.data.stats.updated}, skipped ${response.data.stats.skipped}${response.data.stats.errors > 0 ? `, ${response.data.stats.errors} errors` : ''}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Show warnings if any
        if (response.data.warnings && response.data.warnings.length > 0) {
          response.data.warnings.forEach((warning: string) => {
            toast({
              title: 'Import Warning',
              description: warning,
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          });
        }

        // Add a small delay to ensure data is refreshed
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Navigate to leads page after successful upload
        navigate('/leads');
      } else if (response.data.error) {
        // Handle vendor detection or parsing errors
        throw new Error(response.data.error);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error: any) {
      console.error('Upload error:', error);

      let errorMessage = 'Failed to upload CSV file. Please check the file format and try again.';

      // Extract error message from response if available
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Authentication error. Please log in again.';
          // Redirect to login page
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setFile(null);
    }
  };

  // Add these new functions for reconciliation and fixing duplicates
  const handleReconcileDispositions = async () => {
    setIsReconciling(true);
    setReconciliationResult(null);

    try {
      const response = await axiosInstance.('/leads/reconcile-dispositions');
      console.log('Reconciliation response:', response.data);

      setReconciliationResult(response.data);

      // Show a toast message
      toast({
        title: 'Disposition Reconciliation',
        description: response.data.message,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh leads data
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error('Reconciliation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reconcile dispositions',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const handleFixCsvDuplicates = async () => {
    setIsFixingDuplicates(true);
    setDuplicateFixResult(null);

    try {
      const response = await axiosInstance.('/leads/fix-csv-duplicates');
      console.log('Duplicate fix response:', response.data);

      setDuplicateFixResult(response.data);

      // Show a toast message
      toast({
        title: 'CSV Duplicates Fixed',
        description: `Found ${response.data.stats.phoneDuplicates} duplicate phone numbers and ${response.data.stats.emailDuplicates} duplicate emails. Recovered ${response.data.stats.dispositionsRecovered} dispositions.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh leads data
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      console.error('Fix duplicates error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fix CSV duplicates',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsFixingDuplicates(false);
    }
  };

  // Add type guards for reconciliationResult and duplicateFixResult
  const isReconResult = (val: unknown): val is { message?: string; stats?: any; action?: string } =>
    typeof val === 'object' && val !== null;

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading textAlign="center">CSV Lead Upload</Heading>

        <Box
          border="2px dashed"
          borderColor={isDragging ? 'blue.500' : 'gray.300'}
          borderRadius="lg"
          p={8}
          textAlign="center"
          bg={isDragging ? 'blue.50' : 'white'}
          _hover={{ borderColor: 'blue.500' }}
          transition="all 0.2s"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="csv-upload"
          />
          <label htmlFor="csv-upload">
            <VStack spacing={4} cursor="pointer">
              <Icon
                as={FaCloudUploadAlt}
                w={12}
                h={12}
                color={isDragging ? 'blue.500' : 'gray.400'}
              />
              <Text fontSize="lg" fontWeight="medium">
                {file ? file.name : 'Click to select or drag and drop CSV file'}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Only CSV files are supported
              </Text>
            </VStack>
          </label>
        </Box>

        {file && (
          <VStack spacing={4}>
            <HStack spacing={2}>
              <Icon as={FaFileCsv} color="green.500" />
              <Text>{file.name}</Text>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              Size: {(file.size / 1024).toFixed(2)} KB
            </Text>
          </VStack>
        )}

        {isUploading && (
          <VStack spacing={2}>
            <Progress value={uploadProgress} size="sm" width="100%" />
            <Text fontSize="sm" color="gray.500">
              Uploading... {Math.round(uploadProgress)}%
            </Text>
          </VStack>
        )}

        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleUpload}
          isLoading={isUploading}
          loadingText="Uploading..."
          isDisabled={!file || isUploading}
        >
          Upload Leads
        </Button>

        <Box bg="gray.50" p={4} borderRadius="md">
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            CSV Format Support:
          </Text>
          <Text fontSize="sm" color="gray.600" mb={2}>
            The system automatically detects your CSV vendor type:
          </Text>
          <VStack align="start" spacing={2} fontSize="sm" color="gray.600" ml={4}>
            <Box>
              <Text fontWeight="semibold">NextGen CSV Files:</Text>
              <Text>Detected by columns: purchase_id, vertical_id, vendor_id</Text>
            </Box>
            <Box>
              <Text fontWeight="semibold">Marketplace CSV Files:</Text>
              <Text>Detected by columns: leadID, utm_source, primaryPhone</Text>
            </Box>
          </VStack>
          <Text fontSize="sm" color="gray.600" mt={3}>
            All fields will be automatically mapped to the correct format.
          </Text>
        </Box>

        {/* New section for data reconciliation */}
        <Divider my={6} />

        <VStack spacing={4} align="stretch">
          <Heading size="md">Data Repair Tools</Heading>

          <Alert status="warning" borderRadius="md">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              These tools attempt to fix data inconsistencies from previous CSV uploads. They should
              only be used if you're experiencing issues with leads showing up in filters but having
              incorrect or missing dispositions.
            </AlertDescription>
          </Alert>

          <HStack spacing={4}>
            <Button
              leftIcon={<FaSyncAlt />}
              colorScheme="orange"
              isLoading={isReconciling}
              loadingText="Reconciling..."
              onClick={handleReconcileDispositions}
              flex={1}
            >
              Reconcile Dispositions
            </Button>

            <Button
              leftIcon={<FaWrench />}
              colorScheme="red"
              isLoading={isFixingDuplicates}
              loadingText="Fixing..."
              onClick={handleFixCsvDuplicates}
              flex={1}
            >
              Fix CSV Duplicates
            </Button>
          </HStack>

          {isReconResult(reconciliationResult) && reconciliationResult.message && (
            <Box bg="blue.50" p={4} borderRadius="md" mt={2}>
              <Text fontWeight="medium">Reconciliation Results:</Text>
              <Text>{reconciliationResult.message}</Text>
            </Box>
          )}

          {isReconResult(duplicateFixResult) && duplicateFixResult.stats && (
            <Box bg="blue.50" p={4} borderRadius="md" mt={2}>
              <Text fontWeight="medium">Duplicate Fix Results:</Text>
              <Text>
                Found {duplicateFixResult.stats.phoneDuplicates} phone duplicates and{' '}
                {duplicateFixResult.stats.emailDuplicates} email duplicates.
              </Text>
              <Text>
                Recovered {duplicateFixResult.stats.dispositionsRecovered} dispositions and{' '}
                {duplicateFixResult.stats.notesRecovered} notes.
              </Text>
              <Text mt={2} fontStyle="italic">
                {duplicateFixResult.action}
              </Text>
            </Box>
          )}
        </VStack>
      </VStack>
    </Container>
  );
};

export default CsvUpload;
