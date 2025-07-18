import '../config/envLoader';
import mongoose from 'mongoose';
import LeadModel from '../models/Lead';

(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(uri);

  // Sample 5 leads lacking sourceCode
  const sample = await LeadModel.find({
    $or: [
      { sourceCode: { $exists: false } },
      { sourceCode: null },
      { sourceCode: '' },
    ],
  })
    .limit(5)
    .select({ vendorData: 1, notesMetadata: 1, vendorLeadId: 1, name: 1 })
    .lean();

  console.log('\n==== SAMPLE (first 5) ====');
  console.log(JSON.stringify(sample, null, 2));

  // Aggregate counts
  const stats = await LeadModel.aggregate([
    {
      $group: {
        _id: 0,
        total: { $sum: 1 },
        missingSource: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$sourceCode', null] },
                  { $eq: ['$sourceCode', ''] },
                  { $not: [{ $ifNull: ['$sourceCode', false] }] },
                ],
              },
              1,
              0,
            ],
          },
        },
        vendorHash: {
          $sum: {
            $cond: [
              { $ifNull: ['$vendorData.data_source_hash', false] },
              1,
              0,
            ],
          },
        },
        vendorHash2: {
          $sum: {
            $cond: [
              { $ifNull: ['$vendorData.source_hash', false] },
              1,
              0,
            ],
          },
        },
        notesHash: {
          $sum: {
            $cond: [
              { $ifNull: ['$notesMetadata.source_hash', false] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  console.log('\n==== COUNTS ====');
  console.log(JSON.stringify(stats, null, 2));

  await mongoose.disconnect();
  process.exit();
})(); 