import Lead from '../models/Lead';
import { runScript, formatDate } from '../utils/scriptUtils';

async function checkLeads(): Promise<void> {
  // Get total count
  const totalCount = await Lead.countDocuments();
  console.log(`Total leads in database: ${totalCount}`);

  // Get count by source
  const sourceStats = await Lead.aggregate([
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  console.log('\nLeads by source:');
  sourceStats.forEach((stat) => {
    console.log(`  ${stat._id || 'No Source'}: ${stat.count}`);
  });

  // Get recently created leads
  const recentLeads = await Lead.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('firstName lastName source createdAt');

  console.log('\nRecent leads:');
  recentLeads.forEach((lead) => {
    console.log(
      `  ${lead.firstName} ${lead.lastName} - ${lead.source} - ${formatDate(lead.createdAt)}`
    );
  });

  // Check for leads with missing data
  const missingData = await Lead.countDocuments({
    $or: [
      { firstName: { $exists: false } },
      { lastName: { $exists: false } },
      { phone: { $exists: false } },
      { source: { $exists: false } },
    ],
  });

  console.log(`\nLeads with missing data: ${missingData}`);
}

// Run the script
runScript('Lead Database Check', checkLeads);
