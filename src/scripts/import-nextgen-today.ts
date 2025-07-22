import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../models/User';
import LeadModel, { upsertLead } from '../models/Lead';

dotenv.config();

async function importTodaysLeads() {
  try {
    console.log('Starting import of recent NextGen leads...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find admin user for lead assignment
    const adminUser = await UserModel.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found to assign leads to');
    }
    
    // Check for NextGen CSV files in the csv directory
    const csvDir = path.join(__dirname, '../../../csv');
    console.log(`Looking for NextGen CSV files in: ${csvDir}`);
    
    // Get all files in directory
    const files = fs.readdirSync(csvDir);
    
    // Filter for CSVs that might be NextGen leads
    const csvFiles = files.filter(file => 
      file.endsWith('.csv') && 
      (file.includes('nextgen') || file.includes('NextGen') || file.includes('leads'))
    );
    
    if (csvFiles.length === 0) {
      console.log('No matching CSV files found. Please place NextGen lead CSV files in the csv directory.');
      return {
        success: false,
        message: 'No NextGen CSV files found'
      };
    }
    
    console.log(`Found ${csvFiles.length} potential NextGen CSV files: ${csvFiles.join(', ')}`);
    
    let totalImported = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    
    // Process each file
    for (const file of csvFiles) {
      const filePath = path.join(csvDir, file);
      console.log(`Processing file: ${file}`);
      
      // Read and parse CSV
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records: any[] = [];
      
      await new Promise((resolve, reject) => {
        parse(fileContent, {
          columns: true,
          skip_empty_lines: true
        }, (err, data) => {
          if (err) reject(err);
          else {
            records.push(...data);
            resolve(null);
          }
        });
      });
      
      console.log(`Found ${records.length} records in file ${file}`);
      
      let fileImported = 0;
      let fileUpdated = 0;
      let fileErrors = 0;
      
      // Process each record
      for (const record of records) {
        try {
          // Build the proper name from available fields
          const firstName = record.first_name || record.firstName || record.name?.split(' ')[0] || '';
          const lastName = record.last_name || record.lastName || (record.name?.split(' ').slice(1).join(' ')) || '';
          const fullName = `${firstName} ${lastName}`.trim() || record.name || '';
          
          // Get phone from correct field
          const phone = record.phone || record.phoneNumber || record.phone_number || '';
          
          // For handling height format
          const formatHeight = (height: string | undefined) => {
            if (!height) return '';
            const heightNum = parseInt(height);
            if (isNaN(heightNum)) return height;
            const feet = Math.floor(heightNum / 12);
            const inches = heightNum % 12;
            return `${feet}'${inches}"`;
          };
          
          // Format DOB if needed
          const formatDate = (date: string | undefined) => {
            if (!date) return '';
            try {
              const parts = date.split('-');
              if (parts.length === 3) {
                return `${parts[1]}/${parts[2]}/${parts[0]}`;  // YYYY-MM-DD to MM/DD/YYYY
              }
              return date;
            } catch (error) {
              return date;
            }
          };
          
          // Check for existing lead to avoid duplicates
          const existingLead = await LeadModel.findOne({
            $or: [
              { phone },
              { email: record.email }
            ]
          });
          
          // Create lead data with all available fields
          const leadData = {
            name: fullName,
            firstName,
            lastName,
            phone,
            email: record.email || `${Date.now()}@noemail.com`,
            zipcode: record.zipcode || record.zip || record.postal_code || '',
            dob: formatDate(record.dob || record.dateOfBirth || record.birth_date || ''),
            height: formatHeight(record.height || record.height_inches || ''),
            weight: record.weight || record.weight_lbs || '',
            gender: record.gender || '',
            state: (record.state || record.stateCode || '').toUpperCase(),
            city: record.city || '',
            street1: record.street || record.street_1 || record.address || '',
            street2: record.street2 || record.street_2 || '',
            status: 'New',
            source: 'NextGen',
            disposition: 'New Lead',
            notes: `🌟 New Lead imported on ${new Date().toLocaleDateString()}\n\nImported from NextGen CSV: ${file}\nLocation: ${record.city || ''}, ${record.state || ''} ${record.zipcode || ''}\n${record.dob ? `DOB: ${formatDate(record.dob)}\n` : ''}${record.height ? `Height: ${formatHeight(record.height)}\n` : ''}${record.weight ? `Weight: ${record.weight}\n` : ''}${record.gender ? `Gender: ${record.gender}\n` : ''}\n${JSON.stringify(record, null, 2)}`,
            assignedTo: adminUser._id,
          };
          
          if (!existingLead) {
            // Create new lead
            await LeadModel.create(leadData);
            fileImported++;
            console.log(`Created new lead: ${fullName}`);
          } else {
            // Update existing lead
            await LeadModel.findByIdAndUpdate(existingLead._id, {
              ...leadData,
              // Preserve existing notes by appending new ones
              notes: existingLead.notes + '\n\n' + leadData.notes
            });
            fileUpdated++;
            console.log(`Updated existing lead: ${fullName}`);
          }
        } catch (error) {
          fileErrors++;
          console.error('Error processing record:', error);
          console.error('Record data:', record);
        }
      }
      
      console.log(`File ${file} processed: ${fileImported} imported, ${fileUpdated} updated, ${fileErrors} errors`);
      totalImported += fileImported;
      totalUpdated += fileUpdated;
      totalErrors += fileErrors;
    }
    
    const result = {
      success: true,
      message: `NextGen leads import completed. ${totalImported} imported, ${totalUpdated} updated, ${totalErrors} errors.`,
      imported: totalImported,
      updated: totalUpdated,
      errors: totalErrors
    };
    
    console.log('Import result:', result);
    return result;
  } catch (error) {
    console.error('Error importing NextGen leads:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    };
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run if directly executed
if (require.main === module) {
  importTodaysLeads()
    .then(() => {
      console.log('Import completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importTodaysLeads }; 