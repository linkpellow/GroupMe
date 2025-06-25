const crypto = require('crypto');
const mongoose = require('mongoose');

// Must match the encryption in the controller
const JWT_SECRET = process.env.JWT_SECRET || 'lkj234lkjfdslkj234lkjadsflkjfdaslkjfdalskdfj';
const ENCRYPTION_KEY = JWT_SECRET.substring(0, 32);
const algorithm = 'aes-256-cbc';

function decrypt(encryptedText) {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedData = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function testDecryption() {
  try {
    await mongoose.connect('mongodb://localhost:27017/dialer');
    
    const User = require('./dist/server/src/models/User').default;
    const user = await User.findById('68031c6250449693533f5ae7').select('groupMe.accessToken');
    
    if (user && user.groupMe && user.groupMe.accessToken) {
      console.log('Encrypted token found in database');
      console.log('Encrypted length:', user.groupMe.accessToken.length);
      
      const decryptedToken = decrypt(user.groupMe.accessToken);
      console.log('Decrypted token:', decryptedToken);
      console.log('Expected token: YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI');
      console.log('Tokens match:', decryptedToken === 'YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI');
    } else {
      console.log('No token found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testDecryption(); 