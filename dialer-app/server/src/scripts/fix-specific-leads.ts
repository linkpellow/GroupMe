import mongoose from 'mongoose';
import Lead from '../models/Lead';
import { config } from 'dotenv';

config();

interface LeadJsonData {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  phone_number?: string;
  phoneNumber?: string;
  email?: string;
  state?: string;
  city?: string;
  zip_code?: string;
  zipCode?: string;
  birthday?: string;
  dateOfBirth?: string;
  height?: string;
  weight?: string;
  gender?: string;
}

const fixSpecificLeads = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find the specific leads by email
    const leads = await Lead.find({
      email: { $in: ['withywanda1@aol.com', 'spoolebusiness@outlook.com'] },
    });

    console.log(`Found ${leads.length} leads to fix`);

    for (const lead of leads) {
      try {
        console.log('Processing lead:', {
          email: lead.email,
          name: lead.name,
          notes: lead.notes,
          rawData: lead,
        });

        // Try to extract data from various sources
        let firstName = lead.firstName;
        let lastName = lead.lastName;
        let phone = lead.phone;
        let email = lead.email;
        let state = lead.state;
        let city = lead.city;
        let zipcode = lead.zipcode;
        let dob = lead.dob;
        let height = lead.height;
        let weight = lead.weight;
        let gender = lead.gender;

        // Try to extract from notes if it's a JSON string
        if (lead.notes && lead.notes.includes('{')) {
          try {
            const jsonStr = lead.notes.split('\n')[0];
            const jsonData: LeadJsonData = JSON.parse(jsonStr);

            firstName = jsonData.first_name || jsonData.firstName || firstName;
            lastName = jsonData.last_name || jsonData.lastName || lastName;
            phone = jsonData.phone_number || jsonData.phoneNumber || phone;
            email = jsonData.email || email;
            state = jsonData.state || state;
            city = jsonData.city || city;
            zipcode = jsonData.zip_code || jsonData.zipCode || zipcode;
            dob = jsonData.birthday || jsonData.dateOfBirth || dob;
            height = jsonData.height || height;
            weight = jsonData.weight || weight;
            gender = jsonData.gender || gender;
          } catch (e) {
            console.log('Could not parse JSON from notes for lead:', lead._id);
          }
        }

        // Try to extract from notes text if it's not JSON
        if (lead.notes) {
          const notesLines = lead.notes.split('\n');
          for (const line of notesLines) {
            if (line.includes('first_name') || line.includes('firstName')) {
              firstName = line.split(':')[1]?.trim() || firstName;
            }
            if (line.includes('last_name') || line.includes('lastName')) {
              lastName = line.split(':')[1]?.trim() || lastName;
            }
            if (line.includes('phone') || line.includes('phone_number')) {
              phone = line.split(':')[1]?.trim() || phone;
            }
            if (line.includes('state')) {
              state = line.split(':')[1]?.trim() || state;
            }
            if (line.includes('city')) {
              city = line.split(':')[1]?.trim() || city;
            }
            if (line.includes('zip')) {
              zipcode = line.split(':')[1]?.trim() || zipcode;
            }
            if (line.includes('birthday') || line.includes('dob')) {
              dob = line.split(':')[1]?.trim() || dob;
            }
            if (line.includes('height')) {
              height = line.split(':')[1]?.trim() || height;
            }
            if (line.includes('weight')) {
              weight = line.split(':')[1]?.trim() || weight;
            }
            if (line.includes('gender')) {
              gender = line.split(':')[1]?.trim() || gender;
            }
          }
        }

        // Try to extract name from email if still unknown
        if ((!firstName || !lastName) && email) {
          const emailParts = email.split('@')[0].split(/[._-]/);
          if (emailParts.length >= 2) {
            firstName = emailParts[0];
            lastName = emailParts[1];
          }
        }

        // Set the name fields
        lead.firstName = firstName || 'Unknown';
        lead.lastName = lastName || 'Name';
        lead.name = `${lead.firstName} ${lead.lastName}`.trim();

        // Clean up phone number
        lead.phone = phone?.replace(/\D/g, '') || '';

        // Ensure email exists
        lead.email = email;

        // Set other fields
        lead.state = state || '';
        lead.city = city || '';
        lead.zipcode = zipcode || '';
        lead.dob = dob || '';
        lead.height = height || '';
        lead.weight = weight || '';
        lead.gender = gender || '';
        lead.disposition = lead.disposition || 'New Lead';

        // Update notes to include all available information
        const notes = lead.notes || '';
        const additionalInfo = `\nLocation: ${lead.city}, ${lead.state} ${lead.zipcode}
DOB: ${lead.dob}
Height: ${lead.height}
Weight: ${lead.weight}
Gender: ${lead.gender}`;

        // Only add the additional info if it's not already in the notes
        if (!notes.includes('Location:')) {
          lead.notes = notes + additionalInfo;
        }

        // Save the updated lead
        await lead.save();
        console.log(`Updated lead: ${lead.name} (ID: ${lead._id})`);
        console.log('Updated data:', {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          state: lead.state,
          city: lead.city,
          zipcode: lead.zipcode,
          dob: lead.dob,
          height: lead.height,
          weight: lead.weight,
          gender: lead.gender,
        });
      } catch (error) {
        console.error(`Error updating lead ${lead._id}:`, error);
      }
    }

    console.log('Finished updating leads');
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
};

fixSpecificLeads();
