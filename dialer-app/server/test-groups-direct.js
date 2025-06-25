require('dotenv').config();
const mongoose = require('mongoose');

// Set JWT_SECRET environment variable for the controller
process.env.JWT_SECRET = 'lkj234lkjfdslkj234lkjadsflkjfdaslkjfdalskdfj';

async function testGroups() {
  try {
    await mongoose.connect('mongodb://localhost:27017/dialer');
    console.log('Connected to MongoDB');
    
    // Import the controller function
    const { getGroups } = require('./dist/server/src/controllers/groupMe.controller');
    
    // Create a mock request and response
    const mockReq = {
      user: {
        id: '68031c6250449693533f5ae7'
      }
    };
    
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('\n=== Response ===');
        console.log('Status:', this.statusCode || 200);
        console.log('Data:', JSON.stringify(data, null, 2));
      }
    };
    
    console.log('\n=== Testing getGroups ===');
    console.log('User ID:', mockReq.user.id);
    
    // Call the controller function
    await getGroups(mockReq, mockRes);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testGroups(); 