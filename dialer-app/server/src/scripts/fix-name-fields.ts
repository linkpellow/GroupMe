import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadModel from '../models/Lead';

// Load environment variables
dotenv.config();

async function fixNameFields() {
  try {
    console.log('Starting name field correction...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find leads where firstName is "exclusive" or similar bid_type values
    const badLeads = await LeadModel.find({
      $or: [
        { firstName: 'exclusive' },
        { firstName: 'Exclusive' },
        { firstName: { $regex: /^exclusive$/i } },
      ],
    });

    console.log(`Found ${badLeads.length} leads with incorrect name fields`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const lead of badLeads) {
      try {
        // Save the current field values
        const bidType = lead.firstName; // This is likely "exclusive"
        const actualFirstName = lead.lastName; // This is the actual first name
        const possibleLastName = lead.phone; // This might be the last name (in some cases)

        console.log(`Processing lead: ${lead.name}, current values:`, {
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
        });

        // Logic to detect if the phone field is actually a last name
        const isPhoneActuallyLastName = lead.phone
          ? !lead.phone.match(/\d{10}/) && !lead.phone.match(/\d{3}-\d{3}-\d{4}/)
          : false;

        // Store the bid_type in the right field
        lead.bidType = bidType;

        // Set firstName to the actual first name
        lead.firstName = actualFirstName;

        // If the phone field looks like a name, move it to lastName and clear phone
        if (isPhoneActuallyLastName) {
          lead.lastName = lead.phone;
          // We'll need to find the correct phone number from notes or leave blank
          lead.phone = '';
        }

        // If we don't have a phone number, check if it's in notes
        if (!lead.phone) {
          // Try to extract phone from notes (simplified example)
          if (lead.notes) {
            const notesObj = JSON.parse(lead.notes);
            if (notesObj.phone) {
              lead.phone = notesObj.phone;
            }
          }
        }

        // Update the full name
        lead.name = `${lead.firstName} ${lead.lastName}`.trim();

        // Save the changes
        await lead.save();

        console.log(`Fixed lead: ${lead.name}, updated values:`, {
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          bidType: lead.bidType,
        });

        fixedCount++;
      } catch (error) {
        console.error(`Error fixing lead ${lead._id}:`, error);
        errorCount++;
      }
    }

    console.log(`Finished fixing names. Results: ${fixedCount} fixed, ${errorCount} errors`);
  } catch (error) {
    console.error('Error in fix-name-fields script:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the fix
fixNameFields().catch(console.error);
