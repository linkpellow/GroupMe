import mongoose from 'mongoose';
import '../config/envLoader';
import Lead from '../models/Lead';

/**
 * Debug Script: Analyze NextGen lead data for UI visibility issue
 * 
 * This script comprehensively analyzes the database state to understand
 * why source hashes aren't visible in the UI.
 */

async function debugLeadVisibility() {
  console.log('🔍 Starting NextGen lead visibility analysis...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    // Phase 1: Get complete structure of one NextGen lead
    console.log('=== PHASE 1: COMPLETE LEAD STRUCTURE ===');
    const sampleLead = await Lead.findOne({ source: 'NextGen' });
    
    if (!sampleLead) {
      console.log('❌ No NextGen leads found in database');
      return;
    }

    console.log('Sample NextGen Lead Structure:');
    console.log(JSON.stringify(sampleLead, null, 2));
    
    console.log('\n=== KEY FIELDS FOR SOURCE TRACKING ===');
    console.log('sourceCode:', sampleLead.sourceCode);
    console.log('sourceHash:', sampleLead.sourceHash);
    console.log('campaign:', (sampleLead as any).campaign);
    console.log('campaignName:', (sampleLead as any).campaignName);
    console.log('source:', sampleLead.source);

    // Phase 2: Migration verification - check multiple leads
    console.log('\n=== PHASE 2: MIGRATION VERIFICATION (10 samples) ===');
    const leads = await Lead.find({ source: 'NextGen' })
      .select('sourceCode sourceHash campaign campaignName source createdAt firstName lastName')
      .limit(10);

    leads.forEach((lead, i) => {
      console.log(`Lead ${i+1} (${lead.firstName} ${lead.lastName}):`);
      console.log('  sourceCode:', lead.sourceCode);
      console.log('  sourceHash:', lead.sourceHash);
      console.log('  campaign:', (lead as any).campaign);
      console.log('  campaignName:', (lead as any).campaignName);
      console.log('---');
    });

    // Phase 3: Data pattern analysis
    console.log('\n=== PHASE 3: DATA PATTERN ANALYSIS ===');
    const [
      totalNextGen,
      withSourceCode,
      withSourceHash,
      withCampaign,
      withCampaignName,
      withExpectedHashes
    ] = await Promise.all([
      Lead.countDocuments({ source: 'NextGen' }),
      Lead.countDocuments({ source: 'NextGen', sourceCode: { $exists: true, $ne: null, $ne: '' } }),
      Lead.countDocuments({ source: 'NextGen', sourceHash: { $exists: true, $ne: null, $ne: '' } }),
      Lead.countDocuments({ source: 'NextGen', campaign: { $exists: true, $ne: null, $ne: '' } }),
      Lead.countDocuments({ source: 'NextGen', campaignName: { $exists: true, $ne: null, $ne: '' } }),
      Lead.countDocuments({ source: 'NextGen', sourceCode: { $regex: /^(yBXw2|yBXww|yC2bC|yC2kH)/ } })
    ]);

    console.log('Total NextGen leads:', totalNextGen);
    console.log('NextGen leads with sourceCode:', withSourceCode);
    console.log('NextGen leads with sourceHash:', withSourceHash);
    console.log('NextGen leads with campaign:', withCampaign);
    console.log('NextGen leads with campaignName:', withCampaignName);
    console.log('NextGen leads with expected hash values:', withExpectedHashes);

    // Phase 4: Check for field variations
    console.log('\n=== PHASE 4: FIELD VARIATIONS CHECK ===');
    
    // Get distinct sourceCode values
    const sourceCodeValues = await Lead.distinct('sourceCode', { source: 'NextGen' });
    console.log('Distinct sourceCode values:');
    sourceCodeValues.forEach(value => console.log('  -', JSON.stringify(value)));

    // Get distinct sourceHash values  
    const sourceHashValues = await Lead.distinct('sourceHash', { source: 'NextGen' });
    console.log('\nDistinct sourceHash values:');
    sourceHashValues.forEach(value => console.log('  -', JSON.stringify(value)));

    // Phase 5: API Response Simulation
    console.log('\n=== PHASE 5: API RESPONSE SIMULATION ===');
    const apiLead = await Lead.findOne({ source: 'NextGen' });
    
    if (apiLead) {
      console.log('Raw Database Object:');
      console.log(JSON.stringify(apiLead, null, 2));
      
      console.log('\nSerialized API Response (toJSON):');
      console.log(JSON.stringify(apiLead.toJSON(), null, 2));
      
      // Check if there are any differences
      const rawKeys = Object.keys(apiLead.toObject());
      const jsonKeys = Object.keys(apiLead.toJSON());
      
      console.log('\nField comparison:');
      console.log('Raw object fields:', rawKeys.length);
      console.log('JSON serialized fields:', jsonKeys.length);
      
      const missingInJson = rawKeys.filter(key => !jsonKeys.includes(key));
      const extraInJson = jsonKeys.filter(key => !rawKeys.includes(key));
      
      if (missingInJson.length > 0) {
        console.log('Fields missing in JSON:', missingInJson);
      }
      if (extraInJson.length > 0) {
        console.log('Extra fields in JSON:', extraInJson);
      }
    }

    console.log('\n✅ Analysis completed successfully');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run analysis
debugLeadVisibility(); 