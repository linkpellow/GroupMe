"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Lead_1 = __importDefault(require("../models/Lead"));
const scriptUtils_1 = require("../utils/scriptUtils");
async function importCsvLeads() {
    const filePath = process.argv[2];
    if (!filePath) {
        throw new Error('Please provide a CSV file path as argument');
    }
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    await (0, scriptUtils_1.processCsvFile)(filePath, async (records) => {
        // Process in batches
        await (0, scriptUtils_1.processBatch)(records, 100, async (batch) => {
            const promises = batch.map(async (record) => {
                try {
                    // Skip if no phone number
                    if (!record.phone) {
                        totalSkipped++;
                        return;
                    }
                    // Check for existing lead
                    const existingLead = await Lead_1.default.findOne({
                        phone: scriptUtils_1.LeadFormatters.formatPhone(record.phone),
                    });
                    if (existingLead) {
                        totalSkipped++;
                        console.log(`Skipping duplicate lead: ${record.phone}`);
                        return;
                    }
                    // Create new lead with formatted data
                    const newLead = new Lead_1.default({
                        firstName: scriptUtils_1.LeadFormatters.formatName(record.firstName),
                        lastName: scriptUtils_1.LeadFormatters.formatName(record.lastName),
                        phone: scriptUtils_1.LeadFormatters.formatPhone(record.phone),
                        email: record.email?.toLowerCase().trim(),
                        address: record.address?.trim(),
                        city: record.city?.trim(),
                        state: record.state?.toUpperCase().trim(),
                        zipCode: scriptUtils_1.LeadFormatters.formatZipCode(record.zipCode),
                        source: record.source || 'CSV Import',
                        importedAt: new Date(),
                    });
                    await newLead.save();
                    totalImported++;
                }
                catch (error) {
                    totalErrors++;
                    console.error('Error importing record:', error);
                }
            });
            await Promise.all(promises);
        }, 'CSV records');
    });
    (0, scriptUtils_1.logSummary)({
        'Total Records Processed': totalImported + totalSkipped + totalErrors,
        'Successfully Imported': totalImported,
        'Skipped (Duplicates/Invalid)': totalSkipped,
        Errors: totalErrors,
    });
}
// Run the import script
(0, scriptUtils_1.runScript)('CSV Lead Import', importCsvLeads);
