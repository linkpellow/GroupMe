const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔍 GroupMe Token Debug Tool');
console.log('==========================\n');

console.log('This tool will help debug GroupMe token issues.');
console.log('You can get a token from the URL after GroupMe OAuth redirect.\n');

rl.question('Enter your GroupMe access token: ', async (token) => {
  console.log('\n=== Testing Token ===');
  console.log('Token length:', token.length);
  console.log('Token format check:', /^[a-zA-Z0-9]+$/.test(token) ? '✅ Valid format' : '❌ Invalid format');
  console.log('First 20 chars:', token.substring(0, 20) + '...\n');

  // Test 1: Direct API call
  console.log('Test 1: Direct API Call to GroupMe');
  console.log('-----------------------------------');
  try {
    const response = await axios.get('https://api.groupme.com/v3/users/me', {
      headers: {
        'X-Access-Token': token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Token is valid');
    console.log('User info:', {
      id: response.data.response.id,
      name: response.data.response.name,
      email: response.data.response.email
    });
  } catch (error) {
    console.error('❌ Token validation failed');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
  }

  // Test 2: Check groups access
  console.log('\n\nTest 2: Fetching Groups');
  console.log('----------------------');
  try {
    const response = await axios.get('https://api.groupme.com/v3/groups', {
      headers: {
        'X-Access-Token': token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Groups fetched successfully');
    console.log('Number of groups:', response.data.response.length);
    if (response.data.response.length > 0) {
      console.log('First 3 groups:');
      response.data.response.slice(0, 3).forEach(group => {
        console.log(`  - ${group.name} (ID: ${group.id})`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to fetch groups');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
  }

  // Test 3: URL encoding test
  console.log('\n\nTest 3: URL Encoding');
  console.log('--------------------');
  const encoded = encodeURIComponent(token);
  const decoded = decodeURIComponent(encoded);
  console.log('Original === Decoded:', token === decoded ? '✅ Match' : '❌ No match');
  
  // Test 4: Check for common issues
  console.log('\n\nTest 4: Common Issues Check');
  console.log('---------------------------');
  if (token.includes(' ')) {
    console.log('⚠️  Token contains spaces - this might cause issues');
  }
  if (token.includes('%')) {
    console.log('⚠️  Token contains % - might need URL decoding');
  }
  if (token.length < 32) {
    console.log('⚠️  Token seems unusually short');
  }
  if (token.length > 64) {
    console.log('⚠️  Token seems unusually long');
  }

  console.log('\n\n=== Summary ===');
  console.log('If the token is valid but still shows as expired in your app:');
  console.log('1. Check browser console for any errors during OAuth flow');
  console.log('2. Verify state parameter is being passed correctly');
  console.log('3. Check if token is being properly extracted from URL hash');
  console.log('4. Ensure no race conditions between API calls');
  console.log('5. Check browser network tab for failed requests\n');

  rl.close();
}); 