import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";

/**
 * HelpPage – basic placeholder page displayed at /help
 * Replace or extend this component with real documentation later.
 */
const HelpPage: React.FC = () => (
  <Box p={8} maxW="3xl" mx="auto">
    <Heading as="h1" size="lg" mb={4}>Need Help?</Heading>
    <Text fontSize="md">
      This is a placeholder Help page. Documentation and support resources
      will be added here in a future release.
    </Text>
  </Box>
);

export default HelpPage; 