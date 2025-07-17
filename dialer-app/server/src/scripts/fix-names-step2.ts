import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadModel from '../models/Lead';

// Load environment variables
dotenv.config();

async function fixNamesPhase2() {
  try {
    console.log('Starting name field correction phase 2...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find leads where phone field is likely a last name (contains no numbers)
    const query = {
      $and: [
        { phone: { $exists: true } },
        { phone: { $ne: '' } },
        { phone: { $not: /\d/ } }, // No digits in the phone field
        { lastName: { $in: ['', null, undefined] } }, // Empty last name
      ],
    };

    const badLeads = await LeadModel.find(query);
    console.log(`Found ${badLeads.length} leads with last names in phone fields`);

    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const lead of badLeads) {
      try {
        // Save the current field values
        const oldPhone = lead.phone;
        const oldName = lead.name;
        const oldFirstName = lead.firstName;
        const oldLastName = lead.lastName;

        console.log(`Processing lead: ${lead.name}, current values:`, {
          name: lead.name,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
        });

        // Logic to check if phone is actually a name
        if (lead.phone && !/\d/.test(lead.phone) && lead.phone.length > 1) {
          // Move phone to lastName if it looks like a name
          lead.lastName = lead.phone;
          lead.phone = '';

          // Try to find the actual phone number in notes
          if (lead.notes) {
            try {
              const notesObj = typeof lead.notes === 'string' ? JSON.parse(lead.notes) : lead.notes;
              if (notesObj.phone) {
                lead.phone = notesObj.phone;
              }
            } catch (e) {
              // Not valid JSON, continue
            }
          }

          // Update the full name
          lead.name = `${lead.firstName} ${lead.lastName}`.trim();

          // Save the changes
          await lead.save();

          console.log(`Fixed lead: ${lead._id}:`);
          console.log('  Original:', {
            name: oldName,
            firstName: oldFirstName,
            lastName: oldLastName,
            phone: oldPhone,
          });
          console.log('  Updated:', {
            name: lead.name,
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
          });

          fixedCount++;
        } else {
          console.log(`Skipping lead ${lead._id}: Phone doesn't look like a name`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error fixing lead ${lead._id}:`, error);
        errorCount++;
      }
    }

    console.log(
      `Finished fixing names (phase 2). Results: ${fixedCount} fixed, ${errorCount} errors, ${skippedCount} skipped`
    );
  } catch (error) {
    console.error('Error in fix-names-step2 script:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the fix
fixNamesPhase2().catch(console.error);
