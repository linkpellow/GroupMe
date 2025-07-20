const mongoose = require('mongoose');

async function analyzeDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Define the Lead schema inline to avoid import issues
    const leadSchema = new mongoose.Schema({}, { strict: false, collection: 'leads' });
    const Lead = mongoose.model('Lead', leadSchema);

    // Find one NextGen lead
    const lead = await Lead.findOne({ source: 'NextGen' });
    
    if (!lead) {
      console.log('No NextGen lead found');
      return;
    }

    console.log('=== COMPLETE LEAD STRUCTURE ===');
    console.log(JSON.stringify(lead, null, 2));
    
    console.log('\n=== KEY FIELDS FOR SOURCE TRACKING ===');
    console.log('sourceCode:', lead.sourceCode);
    console.log('sourceHash:', lead.sourceHash);
    console.log('campaign:', lead.campaign);
    console.log('source:', lead.source);
    
    // Get count of NextGen leads
    const count = await Lead.countDocuments({ source: 'NextGen' });
    console.log('\nTotal NextGen leads:', count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

analyzeDatabase(); 