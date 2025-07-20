require('dotenv').config({ path: './dialer-app/server/.env.local' });
const mongoose = require('mongoose');

async function testAnalyticsData() {
  try {
    console.log('🔍 Testing Analytics Data Pipeline...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get Lead model
    const LeadModel = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));

    // 1. Check total leads
    const totalLeads = await LeadModel.countDocuments();
    console.log(`📊 Total leads in database: ${totalLeads}`);

    // 2. Check SOLD leads specifically
    const soldLeads = await LeadModel.countDocuments({ disposition: 'SOLD' });
    console.log(`💰 SOLD leads in database: ${soldLeads}`);

    // 3. Check leads with dispositions
    const leadsWithDispositions = await LeadModel.countDocuments({ 
      disposition: { $exists: true, $ne: '', $ne: null } 
    });
    console.log(`📋 Leads with dispositions: ${leadsWithDispositions}`);

    // 4. Sample SOLD leads if they exist
    if (soldLeads > 0) {
      console.log('\n🎯 Sample SOLD leads:');
      const sampleSold = await LeadModel.find({ disposition: 'SOLD' })
        .select('name disposition price sourceCode sourceHash createdAt')
        .limit(3)
        .lean();
      
      sampleSold.forEach((lead, i) => {
        console.log(`  ${i+1}. ${lead.name} - $${lead.price || 0} - ${lead.sourceCode || lead.sourceHash || 'No source'}`);
      });
    }

    // 5. Check all dispositions
    console.log('\n📈 All disposition types:');
    const dispositions = await LeadModel.distinct('disposition');
    dispositions.forEach(disp => {
      console.log(`  - "${disp || 'Empty'}"`);
    });

    // 6. Check if analytics would return data
    console.log('\n🧪 Testing analytics aggregation...');
    
    const analyticsTest = await LeadModel.aggregate([
      {
        $match: {
          disposition: 'SOLD',
          $or: [
            { sourceHash: { $exists: true, $nin: [null, ''] } },
            { sourceCode: { $exists: true, $nin: [null, ''] } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRevenue: { $sum: { $toDouble: { $ifNull: ['$price', 0] } } }
        }
      }
    ]);

    if (analyticsTest.length > 0) {
      console.log(`✅ Analytics aggregation successful: ${analyticsTest[0].count} SOLD leads, $${analyticsTest[0].totalRevenue} revenue`);
    } else {
      console.log('❌ Analytics aggregation returned no results');
    }

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAnalyticsData(); 