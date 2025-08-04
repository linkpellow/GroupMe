require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const TEXTDRIP_API_TOKEN = process.env.TEXTDRIP_API_TOKEN;
const TEXTDRIP_PHONE = process.env.TEXTDRIP_PHONE;

if (!TEXTDRIP_API_TOKEN) {
  console.error('❌ TEXTDRIP_API_TOKEN not found in environment');
  process.exit(1);
}

if (!TEXTDRIP_PHONE) {
  console.error('❌ TEXTDRIP_PHONE not found in environment');
  process.exit(1);
}

console.log('📱 Using phone:', TEXTDRIP_PHONE);

const api = axios.create({
  baseURL: 'https://api.textdrip.com/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TEXTDRIP_API_TOKEN}`,
  },
  timeout: 30000,
});

async function testConnection() {
  try {
    console.log('🔍 Fetching campaigns...');
    const response = await api.post('/get-campaign');
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testConnection(); 