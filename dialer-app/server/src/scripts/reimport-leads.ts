import mongoose from 'mongoose';
import fs from 'fs';
import { parse } from 'csv-parse';
import path from 'path';
import dotenv from 'dotenv';
import UserModel from '../models/User';
import LeadModel from '../models/Lead';

// Load environment variables
dotenv.config();

async function reimportLeads() {
  try {
    console.log('Starting clean lead import from CSV files...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await UserModel.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('No admin user found');
    }

    // First clear any remaining test leads
    await LeadModel.deleteMany({});
    console.log('Cleared existing leads from database');

    // Now import leads from both CSV files
    const csvDir = path.join(__dirname, '../../../csv');
    const files = [
      'purchases-2025-02-03-to-2025-03-23.csv',
      'purchases-2025-02-03-to-2025-03-22 (1).csv',
    ];

    let totalImported = 0;
    let totalSkipped = 0;

    for (const file of files) {
      const filePath = path.join(csvDir, file);
      console.log(`Processing file: ${file}`);

      // Read and parse CSV file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records: any[] = [];

      await new Promise((resolve, reject) => {
        parse(
          fileContent,
          {
            columns: true,
            skip_empty_lines: true,
          },
          (err: any, data: any) => {
            if (err) reject(err);
            else {
              records.push(...data);
              resolve(null);
            }
          },
        );
      });

      console.log(`Found ${records.length} records in file ${file}`);

      let importedCount = 0;
      let skippedCount = 0;

      for (const record of records) {
        try {
          // Build the proper full name from first and last name fields
          const firstName = record.first_name || '';
          const lastName = record.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();

          // Skip if we don't have a valid full name
          if (!fullName || fullName === '') {
            skippedCount++;
            continue;
          }

          // Only keep the phone from the original data, not from last name
          const phone = record.phone;
          if (!phone) {
            skippedCount++;
            continue;
          }

          // Create lead data with correct field mapping
          const leadData = {
            name: fullName,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            email: record.email || `${Date.now()}@example.com`,
            zipcode: record.zipcode || '',
            dob: record.dob || '',
            height: record.height || '',
            weight: record.weight || '',
            gender: record.gender || '',
            state: record.state ? record.state.toUpperCase() : '',
            city: record.city || '',
            street1: record.street_1 || '',
            street2: record.street_2 || '',
            status: 'New',
            source: 'NextGen',
            notes: JSON.stringify(record),
            assignedTo: admin._id,
          };

          // Create the lead
          await LeadModel.create(leadData);
          importedCount++;
        } catch (error) {
          console.error('Error processing record:', error);
          skippedCount++;
        }
      }

      console.log(`File ${file} processed: ${importedCount} imported, ${skippedCount} skipped`);
      totalImported += importedCount;
      totalSkipped += skippedCount;
    }

    console.log(
      `Import completed. Total: ${totalImported} leads imported, ${totalSkipped} skipped`,
    );
  } catch (error) {
    console.error('Error in reimporting leads:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the reimport
reimportLeads().catch(console.error);
