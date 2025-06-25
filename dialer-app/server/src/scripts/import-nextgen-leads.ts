import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../models/User';
import LeadModel from '../models/Lead';

dotenv.config();

interface NextGenLead {
  created_at: string;
  lead_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  zipcode: string;
  status: string;
  disposition: string;
  campaign_name: string;
  height?: string;
  weight?: string;
  gender?: string;
  dob?: string;
}

function formatHeight(height: string | undefined): string {
  if (!height) {
    return '';
  }
  return height.slice(0, 1) + "'" + height.slice(1);
}

async function importLeadsFromFile(filePath: string, adminUser: any) {
  // Read and parse CSV file
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const records: NextGenLead[] = [];
  await new Promise((resolve, reject) => {
    parse(
      fileContent,
      {
        columns: true,
        skip_empty_lines: true,
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          records.push(...(data as NextGenLead[]));
          resolve(null);
        }
      }
    );
  });

  console.log(`Found ${records.length} leads to process in ${path.basename(filePath)}`);

  let importedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // Process each lead
  for (const lead of records) {
    try {
      // Check if lead already exists
      const existingLead = await LeadModel.findOne({
        $or: [{ nextgenId: lead.lead_id }, { phone: lead.phone }],
      });

      const leadData = {
        name: `${lead.first_name} ${lead.last_name}`.trim(),
        phone: lead.phone,
        phoneNumber: lead.phone,
        email: lead.email || `${Date.now()}@noemail.com`,
        status: 'New',
        source: 'NextGen',
        notes: `Imported from NextGen\nCampaign: ${lead.campaign_name}\nLocation: ${lead.city}, ${lead.state} ${lead.zipcode}\nOriginal Status: ${lead.status}\nDisposition: ${lead.disposition || 'N/A'}`,
        assignedTo: adminUser._id,
        nextgenId: lead.lead_id,
        company: '',
        state: lead.state || '',
        city: lead.city || '',
        zipcode: lead.zipcode || '',
        height: formatHeight(lead.height),
        weight: lead.weight || '',
        gender: lead.gender || '',
        dob: lead.dob || '',
        firstName: lead.first_name || '',
        lastName: lead.last_name || '',
      };

      if (!existingLead) {
        // Create new lead
        await LeadModel.create(leadData);
        importedCount++;
        console.log(`Created new lead: ${lead.lead_id}`);
      } else {
        // Update existing lead
        await LeadModel.findByIdAndUpdate(existingLead._id, leadData);
        updatedCount++;
        console.log(`Updated existing lead: ${lead.lead_id}`);
      }
    } catch (error) {
      errorCount++;
      console.error('Error processing lead:', error);
      console.error('Lead data:', lead);
    }
  }

  return {
    fileName: path.basename(filePath),
    totalProcessed: records.length,
    imported: importedCount,
    updated: updatedCount,
    errors: errorCount,
  };
}

async function importLeads(userId?: string) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer_app');
    console.log('Connected to MongoDB');

    // Get admin user or use provided user
    let adminUser;
    if (userId) {
      adminUser = await UserModel.findById(userId);
    } else {
      adminUser = await UserModel.findOne({ role: 'admin' });
    }

    if (!adminUser) {
      throw new Error('No user found');
    }

    // Get all CSV files in the directory
    const csvDir = path.join(__dirname, '../../../csv');
    const files = fs
      .readdirSync(csvDir)
      .filter((file) => file.endsWith('.csv'))
      .map((file) => path.join(csvDir, file));

    console.log(`Found ${files.length} CSV files to process`);

    // Process each file
    const results = [];
    for (const file of files) {
      console.log(`\nProcessing ${path.basename(file)}...`);
      const result = await importLeadsFromFile(file, adminUser);
      results.push(result);
    }

    // Print summary
    console.log('\nImport Summary:');
    for (const result of results) {
      console.log(`\nFile: ${result.fileName}`);
      console.log(`Total leads processed: ${result.totalProcessed}`);
      console.log(`New leads imported: ${result.imported}`);
      console.log(`Existing leads updated: ${result.updated}`);
      console.log(`Errors: ${result.errors}`);
    }

    const totals = results.reduce(
      (acc, curr) => ({
        totalProcessed: acc.totalProcessed + curr.totalProcessed,
        imported: acc.imported + curr.imported,
        updated: acc.updated + curr.updated,
        errors: acc.errors + curr.errors,
      }),
      { totalProcessed: 0, imported: 0, updated: 0, errors: 0 }
    );

    console.log('\nOverall Totals:');
    console.log(`Total leads processed: ${totals.totalProcessed}`);
    console.log(`Total new leads imported: ${totals.imported}`);
    console.log(`Total leads updated: ${totals.updated}`);
    console.log(`Total errors: ${totals.errors}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

    return totals;
  } catch (error) {
    console.error('Error importing leads:', error);
    throw error;
  }
}

// Execute the import when this script is run directly
if (require.main === module) {
  importLeads()
    .then((totals) => {
      console.log('Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importLeads };
