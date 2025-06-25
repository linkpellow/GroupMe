const axios = require('axios');

// Set environment variables
process.env.JWT_SECRET = 'lkj234lkjfdslkj234lkjadsflkjfdaslkjfdalskdfj';
process.env.GROUPME_CLIENT_ID = 'm30BXQSEw03mzZK0ZfzDGQqqp8LXHRT2MiZNWWCeC7jmBSAx';
process.env.GROUPME_REDIRECT_URI = 'http://localhost:5173/groupme/callback';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://localhost:27017/dialer';
process.env.PORT = '3001';

// Start the server
const server = require('./dist/server/src/index.js');

// Wait for server to be ready
setTimeout(async () => {
  console.log('\n=== Testing GroupMe Integration ===\n');
  
  try {
    // 1. Login to get a fresh token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@crokodial.com',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // 2. Check GroupMe status
    console.log('\n2. Checking GroupMe status...');
    const statusResponse = await axios.get('http://localhost:3001/api/groupme/oauth/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('GroupMe status:', statusResponse.data);
    
    // 3. Try to get groups
    console.log('\n3. Getting GroupMe groups...');
    try {
      const groupsResponse = await axios.get('http://localhost:3001/api/groupme/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Groups retrieved successfully!');
      console.log('Number of groups:', groupsResponse.data.data.length);
      groupsResponse.data.data.forEach(group => {
        console.log(`  - ${group.name} (ID: ${group.id})`);
      });
    } catch (error) {
      console.log('❌ Error getting groups:', error.response?.data || error.message);
      console.log('\nThis error is expected if you see debug logs above.');
      console.log('Check the console output above for [DEBUG] messages.');
    }
    
    // 4. Clean exit
    console.log('\n=== Test Complete ===');
    process.exit(0);
    
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
    process.exit(1);
  }
}, 3000); // Wait 3 seconds for server to start 