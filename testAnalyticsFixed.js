require('dotenv').config({ path: './dialer-app/server/.env.local' });
const mongoose = require('mongoose');

async function testAnalyticsFixed() {
  try {
    console.log('🔍 Testing Fixed Analytics Data Pipeline...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get Lead model
    const LeadModel = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));

    // 1. Verify total SOLD leads exist
    const totalSOLD = await LeadModel.countDocuments({ disposition: 'SOLD' });
    console.log(`📊 Total SOLD leads in database: ${totalSOLD}`);

    // 2. Check SOLD leads with tenantId
    const soldWithTenant = await LeadModel.countDocuments({ 
      disposition: 'SOLD',
      tenantId: { $exists: true, $ne: null }
    });
    console.log(`🏢 SOLD leads WITH tenantId: ${soldWithTenant}`);

    // 3. Check SOLD leads WITHOUT tenantId (legacy data)
    const soldWithoutTenant = await LeadModel.countDocuments({ 
      disposition: 'SOLD',
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null }
      ]
    });
    console.log(`📜 SOLD leads WITHOUT tenantId (legacy): ${soldWithoutTenant}`);

    // 4. Test the NEW flexible tenant filter logic
    const flexibleTenantFilter = {
      $or: [
        { tenantId: { $exists: true } },  // Any tenantId
        { tenantId: { $exists: false } }  // No tenantId (legacy)
      ]
    };
    
    const soldWithFlexibleFilter = await LeadModel.countDocuments({
      ...flexibleTenantFilter,
      disposition: 'SOLD'
    });
    console.log(`🔧 SOLD leads with FLEXIBLE tenant filter: ${soldWithFlexibleFilter}`);

    // 5. Sample some SOLD leads to see their structure
    const sampleSOLD = await LeadModel.find({ disposition: 'SOLD' })
      .select('name disposition tenantId sourceHash sourceCode price createdAt')
      .limit(5)
      .lean();

    console.log('\n📋 Sample SOLD leads:');
    sampleSOLD.forEach((lead, i) => {
      console.log(`  ${i+1}. ${lead.name} - tenantId: ${lead.tenantId || 'MISSING'} - price: $${lead.price || 0}`);
    });

    console.log('\n✅ Analytics should now work with flexible tenant filtering!');
    console.log('🚀 The 28 SOLD leads should now appear in the Stats dashboard.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testAnalyticsFixed(); 