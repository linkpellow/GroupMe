require('dotenv').config({ path: './dialer-app/server/.env.local' });
const mongoose = require('mongoose');

async function verifyDataMapping() {
  try {
    console.log('🔍 COMPREHENSIVE DATA MAPPING VERIFICATION');
    console.log('==========================================\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get Lead model
    const LeadModel = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));

    // PHASE 1: DATABASE SCHEMA ANALYSIS
    console.log('📊 PHASE 1: DATABASE SCHEMA ANALYSIS');
    console.log('=====================================');

    // Get sample SOLD lead to examine field structure
    const sampleSoldLead = await LeadModel.findOne({ disposition: 'SOLD' });
    
    if (!sampleSoldLead) {
      console.log('❌ No SOLD leads found in database!');
      return;
    }

    console.log(`✅ Sample SOLD lead found: ${sampleSoldLead._id}`);
    console.log('\n🔍 CRITICAL FIELD VERIFICATION:');
    console.log('================================');

    // Check all 7 critical fields
    const criticalFields = [
      'price',
      'state', 
      'city',
      'first_name',
      'last_name', 
      'created_at',
      'campaign_name'
    ];

    const fieldAnalysis = {};
    
    criticalFields.forEach(field => {
      const value = sampleSoldLead[field];
      const exists = value !== undefined && value !== null && value !== '';
      
      fieldAnalysis[field] = {
        exists,
        value: exists ? value : 'MISSING/NULL',
        type: exists ? typeof value : 'undefined'
      };
      
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${field}: ${exists ? value : 'MISSING/NULL'} (${exists ? typeof value : 'undefined'})`);
    });

    // PHASE 2: FIELD NAME VARIATIONS CHECK
    console.log('\n🔍 PHASE 2: FIELD NAME VARIATIONS CHECK');
    console.log('======================================');
    
    const possibleVariations = {
      price: ['price', 'Price', 'cost', 'amount', 'totalPrice'],
      state: ['state', 'State', 'stateCode', 'state_code'],
      city: ['city', 'City', 'cityName', 'city_name'],
      first_name: ['first_name', 'firstName', 'fname', 'given_name'],
      last_name: ['last_name', 'lastName', 'lname', 'surname', 'family_name'],
      created_at: ['created_at', 'createdAt', 'dateCreated', 'created', 'timestamp'],
      campaign_name: ['campaign_name', 'campaignName', 'campaign', 'Campaign']
    };

    for (const [standardField, variations] of Object.entries(possibleVariations)) {
      console.log(`\n📋 ${standardField} variations:`);
      
      variations.forEach(variation => {
        const value = sampleSoldLead[variation];
        const exists = value !== undefined && value !== null && value !== '';
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${variation}: ${exists ? value : 'not found'}`);
      });
    }

    // PHASE 3: AGGREGATE FIELD STATISTICS
    console.log('\n📊 PHASE 3: AGGREGATE FIELD STATISTICS');
    console.log('======================================');

    const totalSoldLeads = await LeadModel.countDocuments({ disposition: 'SOLD' });
    console.log(`📈 Total SOLD leads: ${totalSoldLeads}`);

    for (const field of criticalFields) {
      const existsCount = await LeadModel.countDocuments({ 
        disposition: 'SOLD',
        [field]: { $exists: true, $ne: null, $ne: '' }
      });
      
      const percentage = ((existsCount / totalSoldLeads) * 100).toFixed(1);
      const status = existsCount === totalSoldLeads ? '✅' : '⚠️';
      
      console.log(`${status} ${field}: ${existsCount}/${totalSoldLeads} (${percentage}%)`);
    }

    // PHASE 4: ANALYTICS QUERY SIMULATION
    console.log('\n🧪 PHASE 4: ANALYTICS QUERY SIMULATION');
    console.log('=====================================');

    // Simulate the analytics query with flexible tenant filtering
    const flexibleTenantFilter = { 
      $or: [
        { tenantId: { $exists: true } }, 
        { tenantId: { $exists: false } }
      ] 
    };

    const analyticsTestQuery = {
      ...flexibleTenantFilter,
      disposition: 'SOLD'
    };

    const analyticsResults = await LeadModel.find(analyticsTestQuery)
      .select('price state city first_name last_name created_at campaign_name disposition')
      .limit(5);

    console.log(`✅ Analytics query returned ${analyticsResults.length} results`);
    console.log('\n📋 Sample analytics data:');
    
    analyticsResults.forEach((lead, index) => {
      console.log(`\nLead ${index + 1}:`);
      criticalFields.forEach(field => {
        const value = lead[field];
        const status = (value !== undefined && value !== null && value !== '') ? '✅' : '❌';
        console.log(`  ${status} ${field}: ${value || 'MISSING'}`);
      });
    });

    // PHASE 5: REVENUE CALCULATION TEST
    console.log('\n💰 PHASE 5: REVENUE CALCULATION TEST');
    console.log('===================================');

    const revenueTest = await LeadModel.aggregate([
      { $match: { ...analyticsTestQuery, price: { $exists: true, $ne: null } } },
      { $group: { 
        _id: null, 
        totalRevenue: { $sum: '$price' },
        avgPrice: { $avg: '$price' },
        count: { $sum: 1 }
      }}
    ]);

    if (revenueTest.length > 0) {
      const { totalRevenue, avgPrice, count } = revenueTest[0];
      console.log(`✅ Revenue calculation successful:`);
      console.log(`   💵 Total Revenue: $${totalRevenue?.toFixed(2) || 0}`);
      console.log(`   📊 Average Price: $${avgPrice?.toFixed(2) || 0}`);
      console.log(`   📈 Leads with Price: ${count}`);
    } else {
      console.log('❌ Revenue calculation failed - no leads with valid price field');
    }

    console.log('\n🎯 VERIFICATION COMPLETE');
    console.log('========================');
    
    await mongoose.disconnect();
    console.log('✅ MongoDB connection closed');

  } catch (error) {
    console.error('❌ Error during data mapping verification:', error);
    process.exit(1);
  }
}

verifyDataMapping(); 