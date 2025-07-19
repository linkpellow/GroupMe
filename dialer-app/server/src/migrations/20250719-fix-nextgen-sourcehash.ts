import mongoose from 'mongoose';
import '../config/envLoader';
import Lead from '../models/Lead';

/**
 * Migration: Fix NextGen sourceCode to use source_hash instead of campaign_name
 * 
 * Background: Webhook handler was incorrectly mapping campaign_name to sourceCode.
 * This migration updates existing NextGen leads to use their sourceHash value.
 */

async function fixNextGenSourceCodes() {
  console.log('🔄 Starting NextGen sourceCode migration...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    // Find NextGen leads that likely have campaign names as sourceCode
    // These would NOT look like hash codes (e.g., "2kHewh")
    const leads = await Lead.find({
      source: 'NextGen',
      sourceHash: { $exists: true, $ne: null },
      $and: [
        { sourceHash: { $ne: '' } },
        {
          $or: [
            { sourceCode: { $regex: /\s/, $options: 'i' } }, // Contains spaces
            { sourceCode: { $regex: /^(nextgen|health|insurance|campaign)/i } }, // Common campaign words
            { sourceCode: { $not: { $regex: /^[a-zA-Z0-9]{6,}$/ } } } // Not a hash-like string
          ]
        }
      ]
    }).select('_id sourceCode sourceHash campaignName');

    console.log(`Found ${leads.length} NextGen leads with potential campaign names as sourceCode\n`);

    let updateCount = 0;
    let skipCount = 0;

    for (const lead of leads) {
      // Skip if sourceHash is empty
      if (!lead.sourceHash || lead.sourceHash.trim() === '') {
        skipCount++;
        continue;
      }

      console.log(`Lead ${lead._id}:`);
      console.log(`  Current sourceCode: "${lead.sourceCode}"`);
      console.log(`  Available sourceHash: "${lead.sourceHash}"`);
      
      // Update to use sourceHash
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { sourceCode: lead.sourceHash } }
      );
      
      console.log(`  ✅ Updated to: "${lead.sourceHash}"\n`);
      updateCount++;
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  Total leads found: ${leads.length}`);
    console.log(`  Updated: ${updateCount}`);
    console.log(`  Skipped (no sourceHash): ${skipCount}`);

    // Also check for any NextGen leads without sourceCode at all
    const leadsWithoutSourceCode = await Lead.countDocuments({
      source: 'NextGen',
      sourceCode: { $in: [null, '', 'NextGen'] },
      sourceHash: { $exists: true, $ne: null },
      $and: [{ sourceHash: { $ne: '' } }]
    });

    if (leadsWithoutSourceCode > 0) {
      console.log(`\n⚠️  Found ${leadsWithoutSourceCode} additional NextGen leads with default/empty sourceCode`);
      console.log('   Run migration with --fix-defaults flag to update these as well');
    }

    // Handle --fix-defaults flag
    if (process.argv.includes('--fix-defaults')) {
      console.log('\n🔄 Fixing leads with default sourceCode values...');
      
      const result = await Lead.updateMany(
        {
          source: 'NextGen',
          sourceCode: { $in: [null, '', 'NextGen'] },
          sourceHash: { $exists: true, $ne: null },
          $and: [{ sourceHash: { $ne: '' } }]
        },
        [
          {
            $set: {
              sourceCode: '$sourceHash'
            }
          }
        ]
      );

      console.log(`✅ Updated ${result.modifiedCount} leads with default sourceCode values`);
    }

    console.log('\n✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
fixNextGenSourceCodes(); 