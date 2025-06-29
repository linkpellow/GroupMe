const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB - use production URI if available
const connectDB = async () => {
  try {
    // Use production MongoDB URI if available, otherwise fall back to local
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crokodial';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for password reset');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Reset admin password
const resetAdminPassword = async () => {
  try {
    // Import User model correctly
    const User = require('../dist/server/src/models/User').default;
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@crokodial.com' });
    
    if (!adminUser) {
      console.log('Admin user not found. Creating new admin user...');
      
      // Create new admin user
      const newAdmin = new User({
        email: 'admin@crokodial.com',
        password: 'AH7D6U2H', // This will be hashed by the pre-save hook
        name: 'Admin User',
        username: 'admin@crokodial.com',
        role: 'admin'
      });
      
      await newAdmin.save();
      console.log('New admin user created successfully');
      console.log('Email: admin@crokodial.com');
      console.log('Password: AH7D6U2H');
    } else {
      console.log('Admin user found. Resetting password...');
      
      // Reset password (will be hashed by pre-save hook)
      adminUser.password = 'AH7D6U2H';
      await adminUser.save();
      
      console.log('Admin password reset successfully');
      console.log('Email: admin@crokodial.com');
      console.log('Password: AH7D6U2H');
    }
    
    console.log('Password reset complete!');
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

// Run the script
connectDB().then(() => {
  resetAdminPassword();
}); 