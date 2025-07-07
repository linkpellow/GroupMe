/**
 * GroupMe OAuth Test Script
 * 
 * This script simulates the GroupMe OAuth flow with a valid user ID.
 * It can be used to test the OAuth flow in different environments.
 */

const axios = require('axios');
const readline = require('readline');

// Configuration - can be overridden with environment variables
const BASE_URL = process.env.BASE_URL || 'https://crokodial-api-staging-02dd9c87e429.herokuapp.com';
const TEST_USER_ID = process.env.TEST_USER_ID || '685f46719f3db89e5333341e'; // Admin user from the database
const CLIENT_ID = process.env.CLIENT_ID || '6sdc8GOrrAhoOmTAkdVjArldmIfHfnJh5FivtUulrGEgXw66';
const TEST_MODE = process.env.TEST_MODE || 'interactive'; // 'interactive' or 'automated'

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Test the OAuth initiate endpoint
 */
async function testOAuthInitiate() {
  try {
    console.log('Testing OAuth initiate endpoint...');
    const response = await axios.post(`${BASE_URL}/api/groupme/oauth/initiate`, {
      userId: TEST_USER_ID
    });
    
    console.log('OAuth initiate response:', response.data);
    return response.data.authUrl;
  } catch (error) {
    console.error('Error testing OAuth initiate:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test the callback endpoint directly
 */
async function testCallbackEndpoint() {
  try {
    console.log('Testing callback endpoint directly...');
    
    // Create a test state parameter
    const stateObj = { userId: TEST_USER_ID, timestamp: Date.now() };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');
    
    // Create a test access token
    const testAccessToken = `test_access_token_${Date.now()}`;
    
    // Test the callback endpoint
    const response = await axios.get(`${BASE_URL}/api/groupme/callback`, {
      params: {
        access_token: testAccessToken,
        state
      },
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    
    console.log('Callback response status:', response.status);
    console.log('Callback response headers:', response.headers);
    
    return {
      status: response.status,
      headers: response.headers,
      accessToken: testAccessToken,
      state
    };
  } catch (error) {
    if (error.response?.status === 302) {
      // This is expected - the callback should redirect
      console.log('Callback redirected as expected to:', error.response.headers.location);
      return {
        status: error.response.status,
        headers: error.response.headers,
        location: error.response.headers.location
      };
    }
    
    console.error('Error testing callback endpoint:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Run the full OAuth flow test
 */
async function testOAuthFlow() {
  try {
    console.log('=== GroupMe OAuth Flow Test ===');
    console.log('Base URL:', BASE_URL);
    console.log('Test User ID:', TEST_USER_ID);
    console.log('Client ID:', CLIENT_ID);
    console.log('Test Mode:', TEST_MODE);
    console.log('-----------------------------------');
    
    // Step 1: Generate the state parameter with a valid user ID
    const stateObj = { userId: TEST_USER_ID, timestamp: Date.now() };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');
    
    // Step 2: Construct the OAuth URL directly
    const authUrl = `https://oauth.groupme.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(`${BASE_URL}/groupme/callback`)}&state=${state}`;
    
    console.log('Auth URL:', authUrl);
    console.log('State parameter:', state);
    console.log('State decoded:', JSON.stringify(stateObj));
    
    // Step 3: Open the browser for the user to authenticate
    console.log('\nOpening browser for authentication...');
    console.log('Please complete the authentication process in the browser.');
    console.log('After authentication, you will be redirected to the success page.');
    
    if (TEST_MODE === 'interactive') {
      // Ask user if they want to open the browser
      rl.question('Open browser to test OAuth flow? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          try {
            // Use dynamic import for the 'open' package
            const openModule = await import('open');
            const open = openModule.default;
            await open(authUrl);
            console.log('\nBrowser opened. Please complete the authentication process.');
          } catch (error) {
            console.error('Failed to open browser:', error);
            console.log('\nPlease manually open this URL in your browser:');
            console.log(authUrl);
          }
        } else {
          console.log('\nSkipping browser opening. You can manually open this URL:');
          console.log(authUrl);
        }
        
        console.log('\nAfter authentication, check the server logs for success or error messages.');
        
        // Also test the callback endpoint directly
        console.log('\nTesting callback endpoint directly...');
        await testCallbackEndpoint();
        
        rl.close();
      });
    } else {
      // Automated mode - just test the endpoints without opening browser
      console.log('Running in automated mode - testing endpoints only...');
      
      // Test OAuth initiate
      await testOAuthInitiate();
      
      // Test callback endpoint
      await testCallbackEndpoint();
      
      console.log('\nAutomated tests completed successfully!');
      rl.close();
    }
    
  } catch (error) {
    console.error('Error in OAuth flow test:', error);
    rl.close();
  }
}

// Run the test
testOAuthFlow(); 