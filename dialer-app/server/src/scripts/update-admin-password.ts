import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User'; // Adjust path as needed
import '../config/envLoader'; // Ensure env vars are loaded

const updateUserPassword = async () => {
  const adminEmail = 'admin@crokodial.com';
  const newPassword = 'admin'; // The new password you want to set

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables. Exiting.');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected.');

    console.log(`Searching for user: ${adminEmail}`);
    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.error(`User with email ${adminEmail} not found.`);
      return;
    }

    console.log('User found. Hashing new password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log('Password hashed. Updating user...');

    user.password = hashedPassword;
    await user.save();

    console.log(`Successfully updated password for ${adminEmail}.`);

  } catch (error) {
    console.error('An error occurred while updating the password:', error);
  } finally {
    console.log('Closing database connection.');
    await mongoose.connection.close();
  }
};

updateUserPassword(); 