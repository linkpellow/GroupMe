import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadModel from '../models/Lead';

// Load environment variables
dotenv.config();

async function deleteExclusiveLeads() {
  try {
    console.log('Starting deletion of leads with "exclusive" in name...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find leads with "exclusive" in the name field OR in bidType field
    const query = {
      $or: [
        { name: { $regex: /exclusive/i } }, // Case-insensitive search for "exclusive" in name
        { bidType: 'exclusive' }, // Also check for exclusive in bidType field
      ],
    };

    const exclusiveLeads = await LeadModel.find(query);
    console.log(`Found ${exclusiveLeads.length} leads with "exclusive" in name or bidType`);

    // Log the leads we're about to delete
    console.log('Leads to be deleted:');
    exclusiveLeads.forEach((lead) => {
      console.log(
        `- ID: ${lead._id}, Name: "${lead.name}", Phone: ${lead.phone}, BidType: ${lead.bidType}`
      );
    });

    // Delete the leads
    if (exclusiveLeads.length > 0) {
      const result = await LeadModel.deleteMany(query);
      console.log(
        `Successfully deleted ${result.deletedCount} leads with "exclusive" in name or bidType`
      );
    } else {
      console.log('No leads found to delete');
    }
  } catch (error) {
    console.error('Error deleting exclusive leads:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the deletion
deleteExclusiveLeads().catch(console.error);
