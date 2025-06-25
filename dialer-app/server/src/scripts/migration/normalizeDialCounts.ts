import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import DialCountModel from '../../models/DialCount';
import fs from 'fs';
import { normalizePhone } from '../../../../shared/utils/phoneUtils';

// Load environment variables
const envPath = path.resolve(__dirname, '..', '..', '.env.local');
dotenv.config({ path: envPath });

const MONGO_URI = process.env.MONGODB_URI;

// COPIED FROM shared/utils/phoneUtils.ts TO AVOID PATH ISSUES - NOW REMOVED
// const normalizePhone = (phone: string | undefined | null): string => {
//   if (!phone) return '';
//   return phone.replace(/[^\d]/g, '').slice(-10);
// };

async function migrateDialCounts() {
  if (!MONGO_URI) {
    console.error('MongoDB URI not found in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for migration.');

    const allCounts = await DialCountModel.find({}).lean();
    let updatedCount = 0;
    const operations = [];
    const seenKeys = new Map<string, number>();

    console.log(`Found ${allCounts.length} records to process...`);

    for (const doc of allCounts) {
      const originalPhone = doc.phone;
      const normalized = normalizePhone(originalPhone);

      if (originalPhone === normalized && !seenKeys.has(`${doc.userId}-${normalized}`)) {
        seenKeys.set(`${doc.userId}-${normalized}`, doc.count);
        continue;
      }

      const existingCount = seenKeys.get(`${doc.userId}-${normalized}`) || 0;
      const newCount = existingCount + doc.count;
      seenKeys.set(`${doc.userId}-${normalized}`, newCount);
    }
    
    // Clear the collection
    await DialCountModel.deleteMany({});
    console.log('Cleared existing dialcounts collection.');

    // Insert the merged records
    const newDocs = [];
    for (const [key, count] of seenKeys.entries()) {
        const [userId, phone] = key.split('-');
        newDocs.push({
            userId: new mongoose.Types.ObjectId(userId),
            phone: phone,
            count: count,
            lastDialedAt: new Date()
        });
    }

    if (newDocs.length > 0) {
        await DialCountModel.insertMany(newDocs);
        updatedCount = newDocs.length;
        console.log(`Successfully inserted ${updatedCount} merged and normalized records.`);
    } else {
        console.log('No records needed to be inserted.');
    }

    console.log(`Migration complete. ${updatedCount} records in collection.`);
  } catch (error) {
    console.error('An error occurred during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

migrateDialCounts(); 