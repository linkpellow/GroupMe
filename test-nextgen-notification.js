#!/usr/bin/env node

/**
 * NextGen Lead Notification Test Script
 * 
 * This script sends a test NextGen lead to the webhook endpoint to trigger
 * the new notification banner system with:
 * 1. Multi-line layout (title on first line, lead name on second line)
 * 2. System-level desktop notifications
 * 
 * Usage:
 *   node test-nextgen-notification.js [server-url]
 * 
 * Examples:
 *   node test-nextgen-notification.js                           # Local dev (http://localhost:4000)
 *   node test-nextgen-notification.js https://crokodial-2a1145cec713.herokuapp.com  # Production
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Default NextGen credentials
const DEFAULT_CREDENTIALS = {
  sid: 'crk_c615dc7de53e9a5dbf4ece635ad894f1',
  apikey: 'key_03a8c03fa7b634848bcb260e1a8d12849f9fe1965eefc7de7dc4221c746191da'
};

// Test lead data that will trigger the notification
const TEST_LEAD_DATA = {
  lead_id: `test_${Date.now()}`,
  nextgen_id: `ng_${Date.now()}`,
  first_name: 'Afshin',
  last_name: 'Hasankhani',
  email: 'afshin.test@example.com',
  phone: '555-123-4567',
  city: 'Miami',
  state: 'FL',
  zip_code: '33101',
  street_address: '123 Test Street',
  dob: '01/15/1985',
  age: 39,
  gender: 'Male',
  height: '70',
  weight: '180 lbs',
  tobacco_user: false,
  pregnant: false,
  has_prescription: true,
  has_medicare_parts_ab: false,
  has_medical_condition: false,
  household_size: '3',
  household_income: '75000',
  campaign_name: 'Test Campaign',
  product: 'Health Insurance',
  vendor_name: 'Test Vendor',
  account_name: 'Test Account',
  bid_type: 'CPA',
  price: '125.00',
  source_hash: 'test_source_hash_' + Date.now(),
  sub_id_hash: 'test_sub_id_' + Date.now()
};

function sendTestLead(serverUrl = 'http://localhost:4000') {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/webhooks/nextgen', serverUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const postData = JSON.stringify(TEST_LEAD_DATA);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'sid': DEFAULT_CREDENTIALS.sid,
        'apikey': DEFAULT_CREDENTIALS.apikey,
        'User-Agent': 'NextGen-Test-Script/1.0'
      }
    };

    console.log('\nSending test NextGen lead notification...');
    console.log('Target URL:', serverUrl + '/api/webhooks/nextgen');
    console.log('Test Lead:', `${TEST_LEAD_DATA.first_name} ${TEST_LEAD_DATA.last_name}`);
    console.log('Using SID:', DEFAULT_CREDENTIALS.sid.substring(0, 10) + '...');
    console.log('Timestamp:', new Date().toISOString());
    console.log('\nSending request...');

    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('\nResponse received:');
        console.log('Status Code:', res.statusCode);
        console.log('Status Message:', res.statusMessage);
        
        try {
          const parsedResponse = JSON.parse(responseData);
          console.log('Response Body:', JSON.stringify(parsedResponse, null, 2));
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('\nSUCCESS! Test lead sent successfully!');
            console.log('\nExpected Results:');
            console.log('- In-app notification banner should appear with:');
            console.log('  Line 1: "New NextGen Lead!"');
            console.log('  Line 2: "Afshin Hasankhani" (prominent display)');
            console.log('- Desktop notification should appear (if permissions granted)');
            console.log('- Notification sound should play (if enabled)');
            console.log('\nTip: Open your browser and check the app for the notification!');
            resolve(parsedResponse);
          } else {
            console.log('\nERROR: Unexpected response status');
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        } catch (parseError) {
          console.log('Raw Response:', responseData);
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('\nSUCCESS! (Non-JSON response)');
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode} with unparseable response`));
          }
        }
      });
    });

    req.on('error', (error) => {
      console.log('\nREQUEST ERROR:');
      console.error('Error Details:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\nTroubleshooting:');
        console.log('- Make sure the server is running');
        console.log('- For local dev: Run "npm run dev:server" in the dialer-app directory');
        console.log('- Check if the server is running on the correct port');
      } else if (error.code === 'ENOTFOUND') {
        console.log('\nTroubleshooting:');
        console.log('- Check the server URL is correct');
        console.log('- Make sure you have internet connection for remote servers');
      }
      
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Main execution
async function main() {
  const serverUrl = process.argv[2] || 'http://localhost:4000';
  
  console.log('NextGen Lead Notification Test Script');
  console.log('====================================');
  
  try {
    await sendTestLead(serverUrl);
  } catch (error) {
    console.log('\nTest failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main(); 