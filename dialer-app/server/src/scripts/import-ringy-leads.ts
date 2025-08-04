import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const RINGY_SID = 'iS8buecsrip7k4o82elrluc1kyq6orgm';
const RINGY_AUTH_TOKEN = '0vzxxro9mdg8zo8b2x6177ikfhv86lck';

async function testWebhook() {
  try {
    const timestamp = Date.now();

    // Test sending a lead to our webhook
    const response = await axios.post(
      'http://localhost:3001/api/leads/ringy-webhook',
      {
        firstName: 'Test',
        lastName: 'Lead',
        phone: '+11234567890',
        email: `test-${timestamp}@example.com`,
        source: 'test',
        sid: RINGY_SID,
        authToken: RINGY_AUTH_TOKEN,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Webhook response:', response.data);
  } catch (error: any) {
    console.error('Webhook test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testWebhook();
