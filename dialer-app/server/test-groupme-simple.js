#!/usr/bin/env node

/**
 * Simple GroupMe OAuth Flow Tester
 * This script tests the OAuth flow without requiring additional packages
 */

const axios = require('axios');
const readline = require('readline');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  clientId: process.env.GROUPME_CLIENT_ID || '6sdc8GOrrAhoOmTAkdVjArldmIfHfnJh5FivtUulrGEgXw66',
  redirectUri: process.env.GROUPME_REDIRECT_URI || 'http://localhost:5173/groupme/callback',
  apiUrl: 'https://api.groupme.com/v3',
};

console.log('\n🧪 GroupMe OAuth Simple Tester\n');
console.log('Configuration:');
console.log(`  Client ID: ${CONFIG.clientId}`);
console.log(`  Redirect URI: ${CONFIG.redirectUri}`);
console.log('\n');

// Generate OAuth URL
const state = crypto.randomBytes(16).toString('hex');
const authUrl = `https://oauth.groupme.com/oauth/authorize?client_id=${CONFIG.clientId}&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}&response_type=token&state=${state}`;

console.log('📋 OAuth Authorization URL:');
console.log(authUrl);
console.log('\n');

console.log('📋 Manual Steps:');
console.log('1. Copy the URL above and paste it in your browser');
console.log('2. Log in to GroupMe and authorize the application');
console.log('3. You will be redirected to a URL like:');
console.log('   http://localhost:5173/groupme/callback#access_token=YOUR_TOKEN&...');
console.log('4. Copy the access_token value from the URL');
console.log('\n');

// Interactive token testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Paste the access token here (or press Enter to skip): ', async (accessToken) => {
  if (accessToken && accessToken.trim()) {
    console.log('\n🔍 Testing API with token...\n');
    
    try {
      // Test user info
      const userResponse = await axios.get(`${CONFIG.apiUrl}/users/me`, {
        headers: { 'X-Access-Token': accessToken.trim() }
      });
      
      console.log('✅ Successfully authenticated!');
      console.log(`User: ${userResponse.data.response.name}`);
      console.log(`User ID: ${userResponse.data.response.user_id}`);
      
      // Test groups
      const groupsResponse = await axios.get(`${CONFIG.apiUrl}/groups`, {
        headers: { 'X-Access-Token': accessToken.trim() }
      });
      
      console.log(`\n✅ Found ${groupsResponse.data.response.length} groups`);
      
      if (groupsResponse.data.response.length > 0) {
        console.log('\nFirst 3 groups:');
        groupsResponse.data.response.slice(0, 3).forEach(group => {
          console.log(`  - ${group.name} (ID: ${group.id})`);
        });
      }
      
    } catch (error) {
      console.error('\n❌ API Error:', error.response ? error.response.data : error.message);
    }
  } else {
    console.log('\nNo token provided. Test skipped.');
  }
  
  console.log('\n✨ Test complete!\n');
  rl.close();
}); 