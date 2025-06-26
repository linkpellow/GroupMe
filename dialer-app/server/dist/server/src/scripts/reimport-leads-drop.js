"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const sync_1 = require("csv-parse/sync");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const Lead_1 = __importDefault(require("../models/Lead"));
// Load environment variables
dotenv_1.default.config();
async function reimportLeadsDrop() {
    try {
        console.log('Starting reimport with database drop...');
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI || '');
        console.log('Connected to MongoDB');
        // First, drop the collection using mongoose
        try {
            if (mongoose_1.default.connection.db) {
                await mongoose_1.default.connection.db.dropCollection('leads');
                console.log('Leads collection dropped');
            }
        }
        catch (err) {
            // Ignore collection doesn't exist errors
            if (err.code !== 26) {
                console.error('Error dropping collection:', err);
            }
            else {
                console.log('Collection does not exist, will create new');
            }
        }
        // Get the admin user ID - or create one if none exists
        const adminId = new mongoose_1.default.Types.ObjectId();
        // Create a new leads collection without the unique email constraint
        if (mongoose_1.default.connection.db) {
            await mongoose_1.default.connection.db.createCollection('leads');
            console.log('New leads collection created');
        }
        // Now import leads from both CSV files
        const csvDir = path_1.default.join(__dirname, '../../../csv');
        const files = [
            'purchases-2025-02-03-to-2025-03-23.csv',
            'purchases-2025-02-03-to-2025-03-22 (1).csv',
        ];
        let totalImported = 0;
        let totalSkipped = 0;
        for (const file of files) {
            const filePath = path_1.default.join(csvDir, file);
            console.log(`Processing file: ${file}`);
            // Read and parse CSV file
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            const records = (0, sync_1.parse)(fileContent, {
                columns: true,
                skip_empty_lines: true,
            });
            console.log(`Found ${records.length} records in file ${file}`);
            let importedCount = 0;
            let skippedCount = 0;
            for (const record of records) {
                try {
                    // Skip if the name field contains "exclusive"
                    if ((record.first_name || '').toLowerCase().includes('exclusive') ||
                        (record.last_name || '').toLowerCase().includes('exclusive')) {
                        console.log(`Skipping record with "exclusive" in name: ${record.first_name} ${record.last_name}`);
                        skippedCount++;
                        continue;
                    }
                    // Build the proper full name from first and last name fields
                    const firstName = record.first_name || '';
                    const lastName = record.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    // Skip if we don't have a valid full name
                    if (!fullName || fullName === '') {
                        skippedCount++;
                        continue;
                    }
                    // Only keep the phone from the original data
                    const phone = record.phone || 'Unknown';
                    // Create lead data with correct field mapping
                    // Make email unique by adding random string
                    const randomString = Math.random().toString(36).substring(2, 10);
                    const email = record.email
                        ? `${record.email.split('@')[0]}_${randomString}@${record.email.split('@')[1] || 'example.com'}`
                        : `lead_${randomString}@example.com`;
                    const leadData = {
                        name: fullName,
                        firstName: firstName,
                        lastName: lastName,
                        phone: phone,
                        email: email,
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
                        assignedTo: adminId,
                    };
                    // Use Mongoose model instead of direct MongoDB driver
                    await new Lead_1.default(leadData).save();
                    importedCount++;
                }
                catch (error) {
                    console.error('Error processing record:', error);
                    skippedCount++;
                }
            }
            console.log(`File ${file} processed: ${importedCount} imported, ${skippedCount} skipped`);
            totalImported += importedCount;
            totalSkipped += skippedCount;
        }
        console.log(`Import completed. Total: ${totalImported} leads imported, ${totalSkipped} skipped`);
    }
    catch (error) {
        console.error('Error in reimporting leads:', error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log('MongoDB connection closed');
    }
}
// Run the reimport
reimportLeadsDrop().catch(console.error);
