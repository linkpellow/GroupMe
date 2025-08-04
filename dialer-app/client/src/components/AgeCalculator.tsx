import React, { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';

const AgeCalculator: React.FC = () => {
  const [birthDate, setBirthDate] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [calculatedAge, setCalculatedAge] = useState<string>('');
  const [calculatedYear, setCalculatedYear] = useState<string>('');

  // Calculate age from birthdate
  const calculateAge = (dateString: string) => {
    if (!dateString) {
      setCalculatedAge('');
      return;
    }

    const today = new Date();
    const birthDate = new Date(dateString);

    if (isNaN(birthDate.getTime())) {
      setCalculatedAge('Invalid date');
      return;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    setCalculatedAge(`${age} years old`);
  };

  // Calculate birth year from age
  const calculateBirthYear = (ageString: string) => {
    if (!ageString) {
      setCalculatedYear('');
      return;
    }

    const ageNumber = parseInt(ageString, 10);

    if (isNaN(ageNumber)) {
      setCalculatedYear('Invalid age');
      return;
    }

    const today = new Date();
    const birthYear = today.getFullYear() - ageNumber;

    setCalculatedYear(`Born in ${birthYear}`);
  };

  // Handle birthdate input change
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setBirthDate(newValue);
    calculateAge(newValue);
  };

  // Handle age input change
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setAge(newValue);
    calculateBirthYear(newValue);
  };

  return (
    <Box p={4} bg="gray.800" borderRadius="md" color="white" width="100%">
      <Tabs variant="soft-rounded" colorScheme="orange" isFitted>
        <TabList mb={4}>
          <Tab>Date to Age</Tab>
          <Tab>Age to Date</Tab>
        </TabList>

        <TabPanels>
          <TabPanel p={0}>
            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">Birth Date</FormLabel>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={handleBirthDateChange}
                  bg="whiteAlpha.100"
                  _hover={{ bg: 'whiteAlpha.200' }}
                />
              </FormControl>
              {calculatedAge && (
                <Text fontWeight="bold" color="orange.300" mt={2}>
                  {calculatedAge}
                </Text>
              )}
            </VStack>
          </TabPanel>

          <TabPanel p={0}>
            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">Age</FormLabel>
                <Input
                  type="number"
                  value={age}
                  onChange={handleAgeChange}
                  placeholder="Enter age"
                  bg="whiteAlpha.100"
                  _hover={{ bg: 'whiteAlpha.200' }}
                />
              </FormControl>
              {calculatedYear && (
                <Text fontWeight="bold" color="orange.300" mt={2}>
                  {calculatedYear}
                </Text>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default AgeCalculator;
