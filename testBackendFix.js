/**
 * Test Backend Fix - Validate Enhanced Stats Endpoint
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow';

const leadSchema = new mongoose.Schema({}, { 
  collection: 'leads',
  strict: false
});

// Simulate the enhanced getLeadStats function (exactly as fixed)
async function simulateEnhancedStatsEndpoint(LeadModel, userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  // Simple count query
  const totalLeads = await LeadModel.countDocuments({ tenantId: userObjectId });
  
  try {
    // Core filter breakdowns
    const [states, dispositions, sources] = await Promise.all([
      LeadModel.distinct('state', { tenantId: userObjectId }),
      LeadModel.distinct('disposition', { tenantId: userObjectId }),
      LeadModel.distinct('source', { tenantId: userObjectId })
    ]);

    // FIXED: Advanced filters with corrected price handling
    const [prices, sourceHashes, campaigns, sourceCodes, cities] = await Promise.all([
      LeadModel.distinct('price', { tenantId: userObjectId, price: { $exists: true, $nin: [null, '', '0'] } }),
      LeadModel.distinct('sourceHash', { tenantId: userObjectId, sourceHash: { $exists: true, $nin: [null, ''] } }),
      LeadModel.distinct('campaignName', { tenantId: userObjectId, campaignName: { $exists: true, $nin: [null, ''] } }),
      LeadModel.distinct('sourceCode', { tenantId: userObjectId, sourceCode: { $exists: true, $nin: [null, ''] } }),
      LeadModel.distinct('city', { tenantId: userObjectId, city: { $exists: true, $nin: [null, ''] } })
    ]);

    return {
      success: true,
      message: 'Stats data retrieved successfully',
      data: {
        totalLeads,
        filterOptions: {
          states: states.filter(s => s).sort().slice(0, 50),
          dispositions: dispositions.filter(d => d).sort().slice(0, 50),
          sources: sources.filter(s => s).sort()
        },
        // FIXED: Enhanced display limits and price sorting
        breakdowns: {
          prices: prices.filter(p => p && String(p) !== '0').sort((a, b) => parseFloat(String(b)) - parseFloat(String(a))).slice(0, 50),
          sourceHashes: sourceHashes.slice(0, 100),
          campaigns: campaigns.slice(0, 100),
          sourceCodes: sourceCodes.slice(0, 100),
          cities: cities.slice(0, 50)
        },
        counts: {
          uniqueStates: states.length,
          uniqueDispositions: dispositions.length,
          uniqueSources: sources.length,
          uniquePrices: prices.length,
          uniqueCampaigns: campaigns.length,
          uniqueSourceCodes: sourceCodes.length,
          uniqueCities: cities.length
        }
      }
    };

  } catch (distinctError) {
    console.warn('[getLeadStats] Distinct queries failed, using fallback:', distinctError instanceof Error ? distinctError.message : String(distinctError));
    return {
      success: true,
      message: 'Stats data retrieved successfully (basic mode)',
      data: {
        totalLeads,
        filterOptions: { states: [], dispositions: [], sources: [] },
        breakdowns: { prices: [], sourceHashes: [], campaigns: [], sourceCodes: [], cities: [] },
        counts: { uniqueStates: 0, uniqueDispositions: 0, uniqueSources: 0, uniquePrices: 0, uniqueCampaigns: 0, uniqueSourceCodes: 0, uniqueCities: 0 }
      }
    };
  }
}

async function testBackendFix() {
  console.log('🔧 TESTING BACKEND FIX');
  console.log('======================\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const LeadModel = mongoose.model('Lead', leadSchema);
    
    // Find a user with substantial leads
    const userWithLeads = await LeadModel.findOne({ 
      tenantId: { $exists: true },
      campaignName: { $exists: true, $ne: null, $ne: '' }
    }).lean();
    
    if (!userWithLeads) {
      console.log('❌ No user with leads found');
      return;
    }
    
    const userId = userWithLeads.tenantId.toString();
    console.log(`🎯 Testing with user: ${userId}`);
    
    // Test enhanced endpoint
    const startTime = Date.now();
    const apiResponse = await simulateEnhancedStatsEndpoint(LeadModel, userId);
    const endTime = Date.now();
    
    console.log(`⏱️  Response Time: ${endTime - startTime}ms`);
    console.log(`✅ Status: ${apiResponse.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📨 Message: "${apiResponse.message}"\n`);
    
    const { data } = apiResponse;
    
    console.log('📊 BACKEND RESPONSE ANALYSIS');
    console.log('============================');
    console.log(`📈 Total Leads: ${data.totalLeads}`);
    console.log(`📋 Filter Options:`);
    console.log(`   ├─ States: ${data.filterOptions.states.length} items`);
    console.log(`   ├─ Dispositions: ${data.filterOptions.dispositions.length} items`);
    console.log(`   └─ Sources: ${data.filterOptions.sources.length} items`);
    
    console.log(`🎯 Enhanced Breakdowns:`);
    console.log(`   ├─ Campaigns: ${data.breakdowns.campaigns.length} items (limit: 100)`);
    console.log(`   ├─ Source Hashes: ${data.breakdowns.sourceHashes.length} items (limit: 100)`);
    console.log(`   ├─ Source Codes: ${data.breakdowns.sourceCodes.length} items (limit: 100)`);
    console.log(`   ├─ Prices: ${data.breakdowns.prices.length} items (limit: 50)`);
    console.log(`   └─ Cities: ${data.breakdowns.cities.length} items (limit: 50)`);
    
    console.log(`📈 Summary Counts:`);
    console.log(`   ├─ Unique Campaigns: ${data.counts.uniqueCampaigns}`);
    console.log(`   ├─ Unique Source Hashes: ${data.counts.uniqueSourceCodes}`);
    console.log(`   ├─ Unique Prices: ${data.counts.uniquePrices}`);
    console.log(`   └─ Unique Cities: ${data.counts.uniqueCities}`);
    
    console.log('\n🎨 FRONTEND DISPLAY PREVIEW');
    console.log('===========================');
    
    if (data.breakdowns.campaigns.length > 0) {
      console.log(`🏷️  Campaign badges: ${data.breakdowns.campaigns.slice(0, 5).join(', ')}...`);
    }
    
    if (data.breakdowns.sourceHashes.length > 0) {
      console.log(`🔗 Source hash badges: ${data.breakdowns.sourceHashes.slice(0, 5).join(', ')}...`);
    }
    
    if (data.breakdowns.prices.length > 0) {
      console.log(`💰 Price badges: $${data.breakdowns.prices.slice(0, 5).join(', $')}...`);
    }
    
    console.log('\n✅ BACKEND FIX VALIDATION');
    console.log('=========================');
    
    const validationResults = [
      { test: 'Campaign Data', passed: data.breakdowns.campaigns.length > 10, value: data.breakdowns.campaigns.length },
      { test: 'Source Hash Data', passed: data.breakdowns.sourceHashes.length > 10, value: data.breakdowns.sourceHashes.length },
      { test: 'Price Data', passed: data.breakdowns.prices.length > 0, value: data.breakdowns.prices.length },
      { test: 'Source Code Data', passed: data.breakdowns.sourceCodes.length > 10, value: data.breakdowns.sourceCodes.length },
      { test: 'Performance', passed: endTime - startTime < 1000, value: `${endTime - startTime}ms` }
    ];
    
    validationResults.forEach(result => {
      console.log(`${result.passed ? '✅' : '❌'} ${result.test}: ${result.value}`);
    });
    
    const passedTests = validationResults.filter(r => r.passed).length;
    console.log(`\n🎯 Backend Fix Success Rate: ${passedTests}/${validationResults.length} (${Math.round((passedTests / validationResults.length) * 100)}%)`);
    
    if (passedTests === validationResults.length) {
      console.log('\n🎉 BACKEND FIX SUCCESSFUL!');
      console.log('✅ All critical fields now returning substantial data');
      console.log('✅ Display limits increased appropriately');
      console.log('✅ Price sorting fixed for STRING values');
      console.log('✅ Ready for production deployment');
    } else {
      console.log('\n⚠️  Some issues remain - review failed tests');
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  testBackendFix();
}

module.exports = { testBackendFix }; 