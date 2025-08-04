import Lead from '../models/Lead';
import {
  runScript,
  processCsvFile,
  LeadFormatters,
  processBatch,
  logSummary,
} from '../utils/scriptUtils';

interface CsvRecord {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string | number;
  source?: string;
  [key: string]: any;
}

async function importCsvLeads(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error('Please provide a CSV file path as argument');
  }

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  await processCsvFile<CsvRecord>(filePath, async (records) => {
    // Process in batches
    await processBatch(
      records,
      100,
      async (batch) => {
        const promises = batch.map(async (record) => {
          try {
            // Skip if no phone number
            if (!record.phone) {
              totalSkipped++;
              return;
            }

            // Check for existing lead
            const existingLead = await Lead.findOne({
              phone: LeadFormatters.formatPhone(record.phone),
            });

            if (existingLead) {
              totalSkipped++;
              console.log(`Skipping duplicate lead: ${record.phone}`);
              return;
            }

            // Create new lead with formatted data
            const newLead = new Lead({
              firstName: LeadFormatters.formatName(record.firstName),
              lastName: LeadFormatters.formatName(record.lastName),
              phone: LeadFormatters.formatPhone(record.phone),
              email: record.email?.toLowerCase().trim(),
              address: record.address?.trim(),
              city: record.city?.trim(),
              state: record.state?.toUpperCase().trim(),
              zipCode: LeadFormatters.formatZipCode(record.zipCode),
              source: record.source || 'CSV Import',
              importedAt: new Date(),
            });

            await newLead.save();
            totalImported++;
          } catch (error) {
            totalErrors++;
            console.error('Error importing record:', error);
          }
        });

        await Promise.all(promises);
      },
      'CSV records'
    );
  });

  logSummary({
    'Total Records Processed': totalImported + totalSkipped + totalErrors,
    'Successfully Imported': totalImported,
    'Skipped (Duplicates/Invalid)': totalSkipped,
    Errors: totalErrors,
  });
}

// Run the import script
runScript('CSV Lead Import', importCsvLeads);
