const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Your GroupMe token
const GM_TOKEN = 'YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI';
const USER_ID = '68031c6250449693533f5ae7';

// MUST match the controller's encryption method!
const JWT_SECRET = 'lkj234lkjfdslkj234lkjadsflkjfdaslkjfdalskdfj';
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(JWT_SECRET)
  .digest();
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function fixToken() {
  console.log('Fixing GroupMe token encryption...\n');
  
  try {
    // Test token with GroupMe API first
    console.log('1. Verifying token with GroupMe API...');
    const response = await axios.get('https://api.groupme.com/v3/users/me', {
      headers: {
        'X-Access-Token': GM_TOKEN
      }
    });
    
    console.log('✅ Token is valid!');
    console.log('User:', response.data.response.name);
    console.log('Email:', response.data.response.email);
    
    // Connect to MongoDB
    console.log('\n2. Connecting to database...');
    await mongoose.connect('mongodb://localhost:27017/dialer');
    
    // Encrypt token with correct method
    console.log('\n3. Encrypting token with correct method...');
    const encryptedToken = encrypt(GM_TOKEN);
    console.log('Encrypted successfully');
    
    // Update database
    console.log('\n4. Updating database...');
    const User = require('./dist/server/src/models/User').default;
    
    await User.findByIdAndUpdate(USER_ID, {
      'groupMe.accessToken': encryptedToken,
      'groupMe.connectedAt': new Date(),
      'groupMe.email': response.data.response.email,
      'groupMe.name': response.data.response.name
    });
    
    console.log('✅ Database updated successfully');
    
    console.log('\n🎉 GroupMe token fixed!');
    console.log('You should now be able to use GroupMe features.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixToken(); 