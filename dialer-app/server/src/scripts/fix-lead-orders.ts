import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadModel from '../models/Lead';
import UserModel from '../models/User';

// Load environment variables
dotenv.config();

async function fixLeadOrders() {
  try {
    console.log('Starting lead order fix...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Get admin user
    const admin = await UserModel.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('No admin user found');
    }

    // Find all leads assigned to admin
    const leads = await LeadModel.find({ assignedTo: admin._id }).sort({
      createdAt: 1,
    });
    console.log(`Found ${leads.length} leads assigned to admin`);

    // Update order for each lead
    for (let i = 0; i < leads.length; i++) {
      await LeadModel.findByIdAndUpdate(leads[i]._id, { order: i });
      console.log(`Updated order for lead: ${leads[i].name} (${i + 1}/${leads.length})`);
    }

    console.log('Lead order fix complete');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing lead orders:', error);
    process.exit(1);
  }
}

// Run the fix
fixLeadOrders();
