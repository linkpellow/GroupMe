import 'module-alias/register';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadModel from '../models/Lead';
import '../config/envLoader';

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
    if (!mongoUri) throw new Error('MONGO_URI not defined');
    await mongoose.connect(mongoUri);
    console.log('[migration] Connected to MongoDB');

    const BATCH = 500;
    let updated = 0;

    while (true) {
      const leads = await LeadModel.find({
        $or: [{ sourceCode: { $exists: false } }, { sourceCode: null }, { sourceCode: '' }],
      })
        .limit(BATCH)
        .lean();

      if (leads.length === 0) break;

      const bulk = LeadModel.collection.initializeUnorderedBulkOp();

      for (const lead of leads) {
        const sourceHash = (lead as any).vendorData?.data_source_hash || (lead as any).notesMetadata?.source_hash;
        if (!sourceHash) continue;
        bulk.find({ _id: lead._id }).updateOne({ $set: { sourceCode: sourceHash, updatedAt: new Date() } });
        updated++;
      }

      if (bulk.length > 0) {
        await bulk.execute();
        console.log(`[migration] Batch updated ${bulk.length} records`);
      }
    }

    console.log(`[migration] Completed – total leads updated: ${updated}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[migration] Error', err);
    process.exit(1);
  }
})(); 