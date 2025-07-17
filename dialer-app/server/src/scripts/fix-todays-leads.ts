import mongoose from 'mongoose';
import Lead from '../models/Lead';
import { config } from 'dotenv';

config();

const fixTodaysLeads = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Get today's start and end time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find leads created today
    const leads = await Lead.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    console.log(`Found ${leads.length} leads from today`);

    for (const lead of leads) {
      try {
        // Handle splitting name into firstName and lastName if name exists
        if (lead.name) {
          const nameParts = lead.name.split(' ');
          if (nameParts.length >= 2) {
            lead.firstName = nameParts[0];
            lead.lastName = nameParts.slice(1).join(' ');
          } else {
            lead.firstName = lead.name;
          }
        }

        // Clean up phone number
        if (lead.phone) {
          lead.phone = lead.phone.replace(/\D/g, '');
        }

        // Ensure email exists
        if (!lead.email) {
          lead.email = `${lead.phone}@noemail.com`;
        }

        // Format other fields
        lead.state = lead.state || '';
        lead.city = lead.city || '';
        lead.zipcode = lead.zipcode || '';
        lead.disposition = lead.disposition || 'New Lead';

        // Save the updated lead
        await lead.save();
        console.log(`Updated lead: ${lead.name}`);
      } catch (error) {
        console.error(`Error updating lead ${lead.name}:`, error);
      }
    }

    console.log('Finished updating leads');
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
};

fixTodaysLeads();
