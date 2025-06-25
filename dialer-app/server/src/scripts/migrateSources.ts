/**
 * Migration Script: Update Lead Sources
 *
 * This script will:
 * 1. Scan all existing leads
 * 2. Detect their source based on data patterns
 * 3. Update the source field accordingly
 */

import mongoose from 'mongoose';
import Lead from '../models/Lead';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';

async function detectLeadSource(lead: any): Promise<string | null> {
  // Check for NextGen patterns
  if (
    lead.nextgenId ||
    lead.vendorName ||
    lead.notes?.includes('NextGen') ||
    lead.notes?.includes('🌟 New NextGen Lead')
  ) {
    return 'NextGen';
  }

  // Check for Marketplace patterns
  if (lead.notes?.includes('Marketplace') || lead.notes?.includes('🌟 New Marketplace Lead')) {
    return 'Marketplace';
  }

  // Check for Self Generated
  if (
    lead.source === 'Self Generated' ||
    lead.notes?.includes('Self Generated') ||
    lead.notes?.includes('Manual Entry')
  ) {
    return 'Self Generated';
  }

  // Check for CSV Import that hasn't been categorized
  if (lead.source === 'CSV Import') {
    // Try to detect based on field patterns
    // NextGen typically has vendorName, campaignName
    if (lead.vendorName || lead.campaignName) {
      return 'NextGen';
    }
    // Default CSV imports to Marketplace if can't determine
    return 'Marketplace';
  }

  return null;
}

async function migrateSources() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    // Get all leads without a proper source
    const leadsToUpdate = await Lead.find({
      $or: [
        { source: { $exists: false } },
        { source: null },
        { source: '' },
        { source: 'CSV Import' },
        { source: { $nin: ['NextGen', 'Marketplace', 'Self Generated', 'Manual Entry', 'Usha'] } },
      ],
    });

    console.log(`Found ${leadsToUpdate.length} leads to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const lead of leadsToUpdate) {
      const detectedSource = await detectLeadSource(lead);

      if (detectedSource) {
        await Lead.updateOne({ _id: lead._id }, { $set: { source: detectedSource } });
        updatedCount++;
        console.log(`Updated lead ${lead.name} (${lead._id}) - source: ${detectedSource}`);
      } else {
        skippedCount++;
        console.log(`Skipped lead ${lead.name} (${lead._id}) - could not detect source`);
      }
    }

    // Also ensure all existing leads have consistent source values
    console.log('\nNormalizing existing source values...');

    // Fix case variations
    await Lead.updateMany({ source: { $regex: /^nextgen$/i } }, { $set: { source: 'NextGen' } });

    await Lead.updateMany(
      { source: { $regex: /^marketplace$/i } },
      { $set: { source: 'Marketplace' } }
    );

    await Lead.updateMany(
      { source: { $regex: /^self.?generated?$/i } },
      { $set: { source: 'Self Generated' } }
    );

    console.log('\nMigration complete!');
    console.log(`Updated: ${updatedCount} leads`);
    console.log(`Skipped: ${skippedCount} leads`);

    // Show distribution
    const distribution = await Lead.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log('\nLead distribution by source:');
    distribution.forEach((item) => {
      console.log(`  ${item._id || 'No source'}: ${item.count} leads`);
    });
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrateSources().catch(console.error);
}

export default migrateSources;
