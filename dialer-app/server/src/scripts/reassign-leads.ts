import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadModel from '../models/Lead';
import UserModel from '../models/User';

// Load environment variables
dotenv.config();

async function reassignLeads() {
  try {
    console.log('Starting lead reassignment...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Get admin user
    const admin = await UserModel.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('No admin user found');
    }

    // Find all leads
    const leads = await LeadModel.find({});
    console.log(`Found ${leads.length} total leads`);

    // Update each lead to be assigned to admin
    for (const lead of leads) {
      await LeadModel.findByIdAndUpdate(lead._id, {
        assignedTo: admin._id,
        updatedAt: new Date(),
      });
      console.log(`Reassigned lead: ${lead.name}`);
    }

    console.log('Lead reassignment complete');
    process.exit(0);
  } catch (error) {
    console.error('Error reassigning leads:', error);
    process.exit(1);
  }
}

// Run the reassignment
reassignLeads();
