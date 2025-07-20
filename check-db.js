const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Create a simple schema
    const leadSchema = new mongoose.Schema({}, { strict: false, collection: 'leads' });
    const Lead = mongoose.model('Lead', leadSchema);
    
    console.log('=== CHECKING NEXTGEN LEADS ===');
    
    // Get one NextGen lead
    const lead = await Lead.findOne({ source: 'NextGen' });
    
    if (lead) {
      console.log('Sample NextGen Lead:');
      console.log('Name:', lead.name);
      console.log('sourceCode:', lead.sourceCode);
      console.log('sourceHash:', lead.sourceHash);
      console.log('source:', lead.source);
      console.log('campaign:', lead.campaign);
      
      // Check if sourceCode is actually set
      console.log('\n=== FIELD ANALYSIS ===');
      console.log('sourceCode exists:', lead.sourceCode !== undefined);
      console.log('sourceCode is not null:', lead.sourceCode !== null);
      console.log('sourceCode is not empty:', lead.sourceCode !== '');
      console.log('sourceCode value type:', typeof lead.sourceCode);
      console.log('sourceCode actual value:', JSON.stringify(lead.sourceCode));
    } else {
      console.log('No NextGen leads found');
    }
    
    // Count leads with sourceCode
    const withSourceCode = await Lead.countDocuments({ 
      source: 'NextGen', 
      sourceCode: { $exists: true, $ne: null, $ne: '' } 
    });
    
    const total = await Lead.countDocuments({ source: 'NextGen' });
    
    console.log('\n=== COUNTS ===');
    console.log('Total NextGen leads:', total);
    console.log('NextGen leads with sourceCode:', withSourceCode);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkDatabase(); 