import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const resetAdminPassword = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[MIGRATE] Error: MONGODB_URI is not defined.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('[MIGRATE] Connected to MongoDB to reset admin password.');

    const adminEmail = 'admin@crokodial.com';
    const plainPassword = 'admin123';
    
    const adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      console.log(`[MIGRATE] Admin user ${adminEmail} not found. Creating...`);
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      await User.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
        username: adminEmail,
      });
      console.log(`[MIGRATE] Admin user created and password set.`);
    } else {
      // Only update if the password does not match
      const isMatch = await bcrypt.compare(plainPassword, adminUser.password);
      if (!isMatch) {
        console.log(`[MIGRATE] Admin password for ${adminEmail} is incorrect. Resetting...`);
        adminUser.password = plainPassword; // Let the pre-save hook handle hashing
        await adminUser.save();
        console.log(`[MIGRATE] Admin password has been reset successfully.`);
      } else {
        console.log(`[MIGRATE] Admin password for ${adminEmail} is already correct. No action taken.`);
      }
    }
  } catch (error) {
    console.error('[MIGRATE] An error occurred during the password reset migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[MIGRATE] Disconnected from MongoDB.');
  }
};

resetAdminPassword().then(() => {
  process.exit(0);
});
