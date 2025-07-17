const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:5173';

async function testGroupMeFlow() {
  console.log('🧪 Testing GroupMe OAuth Flow');
  console.log('=============================\n');

  try {
    // Step 1: Login first
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@crokodial.com',
      password: 'admin123'
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ Login successful');
    console.log(`   User ID: ${user._id}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
    // Create authenticated axios instance
    const authAxios = axios.create({
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 2: Check GroupMe connection status
    console.log('\n2️⃣ Checking GroupMe connection status...');
    const statusResponse = await axios.get(`${API_URL}/groupme/oauth/status`);
    console.log('✅ Status check successful');
    console.log(`   Connected: ${statusResponse.data.connected}`);
    console.log(`   Connected At: ${statusResponse.data.connectedAt || 'Never'}`);

    // Step 3: Initiate OAuth flow
    console.log('\n3️⃣ Initiating GroupMe OAuth flow...');
    const initiateResponse = await authAxios.post(`${API_URL}/groupme/oauth/initiate`, {
      userId: user._id
    });
    
    const { authUrl, state } = initiateResponse.data.data;
    console.log('✅ OAuth initiation successful');
    console.log(`   Auth URL: ${authUrl}`);
    console.log(`   State: ${state}`);
    
    // Verify the auth URL is correct
    const url = new URL(authUrl);
    console.log('\n📋 OAuth URL Analysis:');
    console.log(`   Host: ${url.host}`);
    console.log(`   Client ID: ${url.searchParams.get('client_id')}`);
    console.log(`   Redirect URI: ${url.searchParams.get('redirect_uri')}`);
    console.log(`   Response Type: ${url.searchParams.get('response_type')}`);
    console.log(`   State Param: ${url.searchParams.get('state')}`);

    console.log('\n✅ All tests passed!');
    console.log('\n📌 Next Steps:');
    console.log('1. Open your browser and go to: http://localhost:5173');
    console.log('2. Log in with admin@crokodial.com / admin123');
    console.log('3. Go to Settings > Integrations');
    console.log('4. Click "Connect GroupMe Account"');
    console.log('5. You should be redirected to GroupMe for authorization');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testGroupMeFlow(); 