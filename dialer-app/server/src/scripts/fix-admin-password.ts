import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import UserModel from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';

async function fixAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the ORIGINAL admin user by ID
    const originalAdminId = '68031c6250449693533f5ae7';

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Update the original admin user's password
    const result = await UserModel.findByIdAndUpdate(
      originalAdminId,
      {
        $set: {
          password: hashedPassword,
        },
      },
      { new: true }
    );

    if (result) {
      console.log('Original admin user password updated successfully!');
      console.log('User ID:', result._id);
      console.log('Email:', result.email);
      console.log('New Password: admin123');

      // Delete the duplicate admin user we accidentally created
      const duplicateDeleted = await UserModel.deleteOne({
        email: 'admin@crokodial.com',
        _id: { $ne: originalAdminId },
      });

      if (duplicateDeleted.deletedCount > 0) {
        console.log('Deleted duplicate admin user');
      }
    } else {
      console.error('Original admin user not found!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing admin password:', error);
    process.exit(1);
  }
}

fixAdminPassword();
