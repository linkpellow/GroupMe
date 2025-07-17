import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadModel from '../models/Lead';
import UserModel from '../models/User';

// Load environment variables
dotenv.config();

async function importWebhookLeads() {
  try {
    console.log('Starting NextGen webhook leads import...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Get admin user for lead assignment
    const admin = await UserModel.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('No admin user found');
    }

    // Find all leads with NextGen webhook data in notes
    const leads = await LeadModel.find({
      notes: { $regex: /"vendor_id":"nextgenleads"/ },
    });

    console.log(`Found ${leads.length} leads with NextGen webhook data`);

    const importedCount = 0;
    let updatedCount = 0;

    // Get the current highest order
    const lastLead = await LeadModel.findOne({ assignedTo: admin._id }).sort({
      order: -1,
    });
    let nextOrder = lastLead?.order !== undefined ? lastLead.order + 1 : 0;

    for (const lead of leads) {
      try {
        if (!lead.notes) {
          console.log(`Skipping lead ${lead._id} - no notes found`);
          continue;
        }

        // Parse the webhook data from notes
        const webhookData = JSON.parse(lead.notes);

        // Format the lead data
        const leadData = {
          name: `${webhookData.first_name} ${webhookData.last_name}`.trim(),
          firstName: webhookData.first_name || '',
          lastName: webhookData.last_name || '',
          phone: webhookData.phone || '',
          email: webhookData.email || `${Date.now()}@noemail.com`,
          status: 'New',
          source: 'NextGen',
          disposition: 'New Lead',
          state: webhookData.state || '',
          city: webhookData.city || '',
          zipcode: webhookData.zipcode || '',
          dob: webhookData.dob ? new Date(webhookData.dob).toLocaleDateString() : '',
          height: webhookData.height
            ? `${Math.floor(parseInt(webhookData.height) / 12)}'${parseInt(webhookData.height) % 12}"`
            : '',
          weight: webhookData.weight || '',
          gender: webhookData.gender
            ? webhookData.gender.charAt(0).toUpperCase() + webhookData.gender.slice(1)
            : '',
          order: nextOrder++,
          notes: `🌟 New Lead\n\nImported from NextGen\nCampaign: ${webhookData.campaign_name || 'Unknown Campaign'}\nLocation: ${webhookData.city || ''}, ${webhookData.state || ''} ${webhookData.zipcode || ''}\nDOB: ${webhookData.dob ? new Date(webhookData.dob).toLocaleDateString() : ''}\nHeight: ${webhookData.height ? `${Math.floor(parseInt(webhookData.height) / 12)}'${parseInt(webhookData.height) % 12}"` : ''}\nWeight: ${webhookData.weight || ''}\nGender: ${webhookData.gender ? webhookData.gender.charAt(0).toUpperCase() + webhookData.gender.slice(1) : ''}\nOriginal Status: ${webhookData.status || 'Unknown'}`,
          assignedTo: admin._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Update the lead
        await LeadModel.findByIdAndUpdate(lead._id, leadData, { new: true });
        console.log(`Updated lead: ${leadData.name}`);
        updatedCount++;
      } catch (error) {
        console.error('Error processing lead:', error);
      }
    }

    console.log('Import complete:', {
      totalLeads: leads.length,
      updatedCount,
    });

    process.exit(0);
  } catch (error) {
    console.error('Error importing leads:', error);
    process.exit(1);
  }
}

// Run the import
importWebhookLeads();
