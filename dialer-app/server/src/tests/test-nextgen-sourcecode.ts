import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3005/api';

// Read test payload
const testPayload = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/nextgen-webhook-payload.json'), 'utf-8')
);

async function testSourceCodeMapping() {
  console.log('Testing NextGen webhook source code mapping...\n');

  try {
    // Send test webhook
    const response = await axios.post(`${API_BASE_URL}/webhooks/nextgen`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'sid': process.env.NEXTGEN_SID || 'test-sid',
        'apikey': process.env.NEXTGEN_API_KEY || 'test-key'
      }
    });

    console.log('Response:', response.data);
    console.log('\nExpected source code:', testPayload.campaign_name);
    
    // Verify the lead was created with correct source code
    if (response.data.leadId) {
      console.log('\n✅ Lead created successfully with ID:', response.data.leadId);
      console.log('Check the database to verify sourceCode is set to:', testPayload.campaign_name);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('\nMake sure:');
    console.error('1. Server is running on port 3005');
    console.error('2. NEXTGEN_SID and NEXTGEN_API_KEY are set in .env');
    process.exit(1);
  }
}

// Run the test
testSourceCodeMapping(); 