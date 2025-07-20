const mongoose = require('mongoose');

async function addSourceHashToNextGenLeads() {
  console.log('=== ADDING SOURCE_HASH TO NEXTGEN LEADS ===');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false, collection: 'leads' }));
    
    // Find all NextGen leads
    const leads = await Lead.find({ source: 'NextGen' });
    console.log('Total NextGen leads:', leads.length);
    
    // Prepare bulk update operations
    const updates = leads.map(lead => {
      const hash = lead._id.toString().slice(-6);
      return {
        updateOne: {
          filter: { _id: lead._id },
          update: { $set: { source_hash: hash } }
        }
      };
    });
    
    // Execute bulk update
    const result = await Lead.bulkWrite(updates);
    console.log('✅ Updated', result.modifiedCount, 'NextGen leads with source_hash');
    
    // Verify the update
    const sampleLead = await Lead.findOne({ source: 'NextGen' });
    console.log('Sample updated lead:');
    console.log('Name:', sampleLead.name);
    console.log('source_hash:', sampleLead.source_hash);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addSourceHashToNextGenLeads(); 