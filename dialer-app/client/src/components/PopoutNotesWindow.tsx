import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Lead } from '../types/Lead';
import NotesEditor from './NotesEditor';
import { ChakraProvider, Box, Heading, Text } from '@chakra-ui/react';
import theme from '../theme';

interface PopoutNotesWindowProps {
  lead: Lead;
}

export const PopoutNotesWindow: React.FC<PopoutNotesWindowProps> = ({ lead }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const popup = window.open(
      '',
      `lead-notes-${lead._id}`,
      'width=600,height=500,top=100,left=100,toolbar=no,menubar=no,location=no'
    );

    if (!popup) return;

    popup.document.title = `Notes – ${lead.name}`;
    // Create a div for React to render into
    const div = popup.document.createElement('div');
    popup.document.body.appendChild(div);
    setContainer(div);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setContainer(null);
      }
    }, 500);

    return () => {
      clearInterval(timer);
      if (!popup.closed) popup.close();
    };
  }, [lead]);

  if (!container) return null;

  return ReactDOM.createPortal(
    <ChakraProvider theme={theme}>
      <Box p={4} bg="gray.50" minH="100vh">
        <Heading size="md" mb={3}>{lead.name}</Heading>
        <Text fontSize="sm" color="gray.600" mb={4}>
          {lead.phone && `Phone: ${lead.phone} `}
          {lead.email && `Email: ${lead.email}`}
        </Text>
        <NotesEditor leadId={lead._id} initialNotes={lead.notes ?? ''} />
      </Box>
    </ChakraProvider>,
    container
  );
};

export default PopoutNotesWindow;
