import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import UserModel from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';

async function fixAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Find and update admin user or create if doesn't exist
    const adminUser = await UserModel.findOneAndUpdate(
      { email: 'admin@crokodial.com' },
      {
        $set: {
          email: 'admin@crokodial.com',
          password: hashedPassword,
          name: 'Admin User',
          username: 'admin@crokodial.com',
          role: 'admin',
        },
      },
      { upsert: true, new: true }
    );

    console.log('Admin user fixed successfully!');
    console.log('Email: admin@crokodial.com');
    console.log('Password: admin123');
    console.log('User ID:', adminUser._id);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing admin user:', error);
    process.exit(1);
  }
}

fixAdminUser();
