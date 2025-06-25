#!/usr/bin/env node

/**
 * GroupMe OAuth Flow Tester
 * This script tests the OAuth flow without requiring the full server
 */

const axios = require('axios');
const readline = require('readline');
const crypto = require('crypto');
const chalk = require('chalk');

// Dynamic import for ESM module
let open;
(async () => {
  try {
    open = (await import('open')).default;
  } catch (e) {
    console.log('Note: open package not available, manual URL opening required');
  }
})();

// Configuration
const CONFIG = {
  clientId: process.env.GROUPME_CLIENT_ID || 'm30BXQSEw03mzZK0ZfzDGQqqp8LXHRT2MiZNWWCeC7jmBSAx',
  redirectUri: process.env.GROUPME_REDIRECT_URI || 'http://localhost:5173/groupme/callback',
  apiUrl: 'https://api.groupme.com/v3',
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

// Utility functions
function log(message, type = 'info') {
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    error: chalk.red('✗'),
    warning: chalk.yellow('⚠'),
  };
  console.log(`${prefix[type]} ${message}`);
}

function addResult(test, passed, message) {
  if (passed) {
    testResults.passed.push({ test, message });
    log(`${test}: ${message}`, 'success');
  } else {
    testResults.failed.push({ test, message });
    log(`${test}: ${message}`, 'error');
  }
}

// Test functions
async function testOAuthUrl() {
  log('Testing OAuth URL generation...', 'info');
  
  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = `https://oauth.groupme.com/oauth/authorize?client_id=${CONFIG.clientId}&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}&response_type=token&state=${state}`;
  
  addResult(
    'OAuth URL',
    authUrl.includes(CONFIG.clientId) && authUrl.includes(encodeURIComponent(CONFIG.redirectUri)),
    `Generated URL: ${authUrl}`
  );
  
  return authUrl;
}

async function testGroupMeAPI(accessToken) {
  log('Testing GroupMe API with token...', 'info');
  
  try {
    // Test 1: Get user info
    const userResponse = await axios.get(`${CONFIG.apiUrl}/users/me`, {
      headers: { 'X-Access-Token': accessToken }
    });
    
    addResult('Get User Info', true, `User: ${userResponse.data.response.name}`);
    
    // Test 2: Get groups
    const groupsResponse = await axios.get(`${CONFIG.apiUrl}/groups`, {
      headers: { 'X-Access-Token': accessToken }
    });
    
    const groupCount = groupsResponse.data.response.length;
    addResult('Get Groups', true, `Found ${groupCount} groups`);
    
    // Test 3: Get a specific group's messages (if groups exist)
    if (groupCount > 0) {
      const firstGroup = groupsResponse.data.response[0];
      const messagesResponse = await axios.get(
        `${CONFIG.apiUrl}/groups/${firstGroup.id}/messages`,
        {
          headers: { 'X-Access-Token': accessToken },
          params: { limit: 5 }
        }
      );
      
      addResult(
        'Get Messages',
        true,
        `Retrieved ${messagesResponse.data.response.messages.length} messages from ${firstGroup.name}`
      );
    }
    
    return true;
  } catch (error) {
    addResult('API Test', false, `Error: ${error.message}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return false;
  }
}

async function interactiveTest() {
  console.log(chalk.cyan('\n🧪 GroupMe OAuth Interactive Tester\n'));
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  
  try {
    // Test OAuth URL generation
    const authUrl = await testOAuthUrl();
    
    console.log(chalk.yellow('\n📋 Manual Steps Required:'));
    console.log('1. Copy this URL and open it in your browser:');
    console.log(chalk.cyan(authUrl));
    console.log('2. Authorize the application');
    console.log('3. You will be redirected to a URL like:');
    console.log(chalk.gray('http://localhost:5173/groupme/callback#access_token=YOUR_TOKEN&...'));
    console.log('4. Copy the access_token value from the URL\n');
    
    const openBrowser = await question('Open URL in browser automatically? (y/n): ');
    if (openBrowser.toLowerCase() === 'y' && open) {
      await open(authUrl);
    } else if (openBrowser.toLowerCase() === 'y' && !open) {
      console.log(chalk.yellow('Auto-open not available. Please copy the URL manually.'));
    }
    
    const accessToken = await question('\nPaste the access token here: ');
    
    if (!accessToken) {
      log('No access token provided', 'error');
      return;
    }
    
    // Test API with token
    console.log(chalk.yellow('\n🔍 Testing API Access...\n'));
    await testGroupMeAPI(accessToken.trim());
    
  } finally {
    rl.close();
  }
  
  // Show results summary
  console.log(chalk.cyan('\n📊 Test Results Summary\n'));
  console.log(chalk.green(`✓ Passed: ${testResults.passed.length}`));
  console.log(chalk.red(`✗ Failed: ${testResults.failed.length}`));
  
  if (testResults.failed.length > 0) {
    console.log(chalk.red('\nFailed Tests:'));
    testResults.failed.forEach(({ test, message }) => {
      console.log(`  - ${test}: ${message}`);
    });
  }
}

// Automated test mode (requires token)
async function automatedTest(accessToken) {
  console.log(chalk.cyan('\n🤖 Running Automated Tests\n'));
  
  await testOAuthUrl();
  await testGroupMeAPI(accessToken);
  
  // Show results
  console.log(chalk.cyan('\n📊 Test Results Summary\n'));
  console.log(chalk.green(`✓ Passed: ${testResults.passed.length}`));
  console.log(chalk.red(`✗ Failed: ${testResults.failed.length}`));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const accessToken = args[0];
  
  if (accessToken) {
    // Automated mode with provided token
    await automatedTest(accessToken);
  } else {
    // Interactive mode
    await interactiveTest();
  }
}

// Run tests
main().catch(error => {
  console.error(chalk.red('\n💥 Unexpected error:'), error);
  process.exit(1);
}); 