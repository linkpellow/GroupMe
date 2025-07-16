/**
 * GroupMe Integration Test Script
 * 
 * This script tests the GroupMe integration by:
 * 1. Mocking different API response formats
 * 2. Verifying the frontend parsing logic can handle both formats
 */

// Mock API responses
const mockResponseWrapped = {
  success: true,
  data: [
    {
      id: '12345',
      name: 'Test Group 1',
      image_url: 'https://example.com/image1.jpg',
      messages_count: 42
    },
    {
      id: '67890',
      name: 'Test Group 2',
      image_url: 'https://example.com/image2.jpg',
      messages_count: 100
    }
  ]
};

const mockResponseDirect = [
  {
    groupId: '12345',
    groupName: 'Test Group 1',
    image_url: 'https://example.com/image1.jpg',
    messages_count: 42
  },
  {
    groupId: '67890',
    groupName: 'Test Group 2',
    image_url: 'https://example.com/image2.jpg',
    messages_count: 100
  }
];

const mockResponseMixed = [
  {
    id: '12345',
    name: 'Test Group 1',
    image_url: 'https://example.com/image1.jpg',
    messages_count: 42
  },
  {
    groupId: '67890',
    groupName: 'Test Group 2',
    image_url: 'https://example.com/image2.jpg',
    messages_count: 100
  }
];

// Test functions
function testFrontendParsingLogic(response, testName) {
  console.log(`\n=== Testing Frontend Parsing Logic: ${testName} ===`);
  
  // This is the same logic from GroupMeContext.tsx refreshGroups function
  let groupsData = [];
  
  if (response && response.success && response.data) {
    // Handle wrapped response format
    groupsData = response.data;
    console.log('Using wrapped format data');
  } else if (Array.isArray(response)) {
    // Handle direct array format
    groupsData = response;
    console.log('Using direct array format');
  }
  
  // Map the data to ensure consistent format
  const formattedGroups = groupsData.map(group => ({
    groupId: group.groupId || group.id,
    groupName: group.groupName || group.name,
    image_url: group.image_url,
    last_message: group.last_message,
    messages_count: group.messages_count
  }));
  
  console.log('Formatted groups count:', formattedGroups.length);
  console.log('Formatted groups:', formattedGroups);
  
  // Verify all groups have the expected properties
  const allValid = formattedGroups.every(group => 
    group.groupId && 
    group.groupName && 
    typeof group.groupId === 'string' && 
    typeof group.groupName === 'string'
  );
  
  console.log('All groups have valid format:', allValid);
  
  return {
    success: allValid,
    groupsCount: formattedGroups.length,
    groups: formattedGroups
  };
}

// Test GroupMeSettings.tsx fetchGroups function
function testSettingsComponentParsing(response, testName) {
  console.log(`\n=== Testing GroupMeSettings.tsx Parsing Logic: ${testName} ===`);
  
  // This is the same logic from GroupMeSettings.tsx fetchGroups function
  let fetchedGroups = [];
  
  if (response && response.success && response.data) {
    // Handle success wrapper format
    fetchedGroups = response.data.map((group) => ({
      id: group.groupId || group.id,
      name: group.groupName || group.name,
    }));
    console.log('Using wrapped format data');
  } else if (Array.isArray(response)) {
    // Handle direct array format
    fetchedGroups = response.map((group) => ({
      id: group.groupId || group.id,
      name: group.groupName || group.name,
    }));
    console.log('Using direct array format');
  }
  
  console.log('Fetched groups count:', fetchedGroups.length);
  console.log('Fetched groups:', fetchedGroups);
  
  // Verify all groups have the expected properties
  const allValid = fetchedGroups.every(group => 
    group.id && 
    group.name && 
    typeof group.id === 'string' && 
    typeof group.name === 'string'
  );
  
  console.log('All groups have valid format:', allValid);
  
  return {
    success: allValid,
    groupsCount: fetchedGroups.length,
    groups: fetchedGroups
  };
}

// Run tests
function runTests() {
  console.log('Starting GroupMe integration tests...');
  
  // Test GroupMeContext.tsx refreshGroups with different response formats
  const contextWrappedResult = testFrontendParsingLogic(mockResponseWrapped, 'Context - Wrapped Format');
  const contextDirectResult = testFrontendParsingLogic(mockResponseDirect, 'Context - Direct Format');
  const contextMixedResult = testFrontendParsingLogic(mockResponseMixed, 'Context - Mixed Format');
  
  // Test GroupMeSettings.tsx fetchGroups with different response formats
  const settingsWrappedResult = testSettingsComponentParsing(mockResponseWrapped, 'Settings - Wrapped Format');
  const settingsDirectResult = testSettingsComponentParsing(mockResponseDirect, 'Settings - Direct Format');
  const settingsMixedResult = testSettingsComponentParsing(mockResponseMixed, 'Settings - Mixed Format');
  
  console.log('\n=== Test Results Summary ===');
  console.log('GroupMeContext - Wrapped Format:', contextWrappedResult.success ? 'SUCCESS' : 'FAILED');
  console.log('GroupMeContext - Direct Format:', contextDirectResult.success ? 'SUCCESS' : 'FAILED');
  console.log('GroupMeContext - Mixed Format:', contextMixedResult.success ? 'SUCCESS' : 'FAILED');
  console.log('GroupMeSettings - Wrapped Format:', settingsWrappedResult.success ? 'SUCCESS' : 'FAILED');
  console.log('GroupMeSettings - Direct Format:', settingsDirectResult.success ? 'SUCCESS' : 'FAILED');
  console.log('GroupMeSettings - Mixed Format:', settingsMixedResult.success ? 'SUCCESS' : 'FAILED');
  
  console.log('\nTests completed.');
}

// Run the tests
runTests(); 