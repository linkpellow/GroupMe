const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Your GroupMe token
const GM_TOKEN = 'YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI';
const USER_ID = '68031c6250449693533f5ae7';

// Encryption functions
const ENCRYPTION_KEY = 'lkj234lkjfdslkj234lkjadsflkjfdaslkjfdalskdfj'.substring(0, 32);
const algorithm = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function testToken() {
  console.log('Testing GroupMe token directly...\n');
  
  try {
    // Test 1: Verify token with GroupMe API
    console.log('1. Testing token with GroupMe API...');
    const response = await axios.get('https://api.groupme.com/v3/users/me', {
      headers: {
        'X-Access-Token': GM_TOKEN
      }
    });
    
    console.log('✅ Token is valid!');
    console.log('User info:', JSON.stringify(response.data.response, null, 2));
    
    // Test 2: Get groups
    console.log('\n2. Fetching groups...');
    const groupsResponse = await axios.get('https://api.groupme.com/v3/groups', {
      headers: {
        'X-Access-Token': GM_TOKEN
      }
    });
    
    console.log(`✅ Found ${groupsResponse.data.response.length} groups`);
    groupsResponse.data.response.forEach(group => {
      console.log(`  - ${group.name} (ID: ${group.id})`);
    });
    
    // Test 3: Save to database
    console.log('\n3. Saving token to database...');
    await mongoose.connect('mongodb://localhost:27017/dialer');
    
    const User = require('./dist/server/src/models/User').default;
    const encryptedToken = encrypt(GM_TOKEN);
    
    await User.findByIdAndUpdate(USER_ID, {
      'groupMe.accessToken': encryptedToken,
      'groupMe.connectedAt': new Date(),
      'groupMe.email': response.data.response.email,
      'groupMe.name': response.data.response.name
    });
    
    console.log('✅ Token saved to database');
    console.log('\n🎉 GroupMe integration is ready!');
    console.log('You can now use GroupMe features in the application.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testToken(); 