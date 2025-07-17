import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  useClipboard,
  Spinner,
  useToast,
  Flex,
} from '@chakra-ui/react';
import { fetchNextGenCred, rotateNextGenCred, NextGenCred } from '../api/nextgen';
import { CopyIcon, RepeatIcon } from '@chakra-ui/icons';

const NextGenCredentialCard: React.FC = () => {
  const [cred, setCred] = useState<NextGenCred | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useToast();

  const { hasCopied: sidCopied, onCopy: copySid } = useClipboard(cred?.sid || '');
  const { hasCopied: keyCopied, onCopy: copyKey } = useClipboard(cred?.apiKey || '');

  useEffect(() => {
    const load = async () => {
      try {
        const c = await fetchNextGenCred();
        setCred(c);
      } catch (err) {
        console.error('Failed to load NextGen cred', err);
        toast({ title: 'Failed to load NextGen credentials', status: 'error', duration: 5000 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const handleRotate = async () => {
    try {
      setLoading(true);
      const newCred = await rotateNextGenCred();
      setCred(newCred);
      toast({ title: 'Keys rotated', status: 'success', duration: 4000 });
    } catch (err) {
      console.error('Rotate failed', err);
      toast({ title: 'Failed to rotate keys', status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box borderWidth={1} borderRadius="lg" p={4} mb={6}>
        <Heading as="h3" size="md" mb={2}>
          NextGen Lead Webhook
        </Heading>
        <Spinner />
      </Box>
    );
  }

  if (!cred) {
    return (
      <Box borderWidth={1} borderRadius="lg" p={4} mb={6}>
        <Heading as="h3" size="md" mb={2}>
          NextGen Lead Webhook
        </Heading>
        <Text>No credential found. Please contact support.</Text>
      </Box>
    );
  }

  return (
    <Box borderWidth={1} borderRadius="lg" p={4} mb={6}>
      <Flex justify="space-between" align="center" mb={2}>
        <Heading as="h3" size="md">
          NextGen Lead Webhook
        </Heading>
        <Button leftIcon={<RepeatIcon />} size="sm" onClick={handleRotate} isLoading={loading}>
          Rotate Key
        </Button>
      </Flex>

      <Text fontSize="sm" color="gray.400" mb={3}>
        Provide these to NextGen as SID & API Key headers.
      </Text>

      <InputGroup mb={3} size="sm">
        <Input isReadOnly value={cred.sid} fontFamily="mono" />
        <InputRightElement>
          <Button size="xs" onClick={copySid}>
            <CopyIcon />
          </Button>
        </InputRightElement>
      </InputGroup>

      <InputGroup mb={3} size="sm">
        <Input isReadOnly value={cred.apiKey} fontFamily="mono" />
        <InputRightElement>
          <Button size="xs" onClick={copyKey}>
            <CopyIcon />
          </Button>
        </InputRightElement>
      </InputGroup>

      <Text fontSize="xs" color="gray.500">
        Created {new Date(cred.createdAt).toLocaleDateString()}
      </Text>
    </Box>
  );
};

export default NextGenCredentialCard; 