import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../../models/User';
import Lead from '../../models/Lead';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

(async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not defined');
    await mongoose.connect(mongoUri);
    console.log('Connected to Mongo');

    const admin = await User.findOne({ role: 'admin' }).lean();
    if (!admin) throw new Error('Admin user not found');

    const result = await Lead.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: admin._id } }
    );

    console.log('Back-fill complete. Modified leads:', result.modifiedCount);
  } catch (err) {
    console.error('Back-fill error', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})(); 