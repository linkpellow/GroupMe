import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Connect to MongoDB with retry logic
 */
export async function connectToDatabase(dbName?: string): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';
  const uri = dbName ? mongoUri.replace(/\/[^/]+$/, `/${dbName}`) : mongoUri;

  try {
    await mongoose.connect(uri);
    console.log(`✅ Connected to MongoDB: ${uri}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB gracefully
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
}

/**
 * Process items in batches
 */
export async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>,
  itemName = 'items'
): Promise<void> {
  console.log(`Processing ${items.length} ${itemName} in batches of ${batchSize}...`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const progress = Math.min(i + batchSize, items.length);

    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1}: ${i + 1}-${progress} of ${items.length}`
    );

    try {
      await processor(batch);
    } catch (error) {
      console.error(`Error processing batch at index ${i}:`, error);
      throw error;
    }
  }
}

/**
 * Standard script wrapper with error handling
 */
export async function runScript(
  scriptName: string,
  scriptFunction: () => Promise<void>
): Promise<void> {
  console.log(`\n🚀 Starting ${scriptName}...`);
  console.log('='.repeat(50));

  const startTime = Date.now();

  try {
    await connectToDatabase();
    await scriptFunction();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('='.repeat(50));
    console.log(`✅ ${scriptName} completed successfully in ${duration}s\n`);
  } catch (error) {
    console.error(`\n❌ ${scriptName} failed:`, error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

/**
 * Format a date for consistent output
 */
export function formatDate(date: Date | undefined | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
}

/**
 * Common CSV parsing options
 */
export const CSV_PARSE_OPTIONS = {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  cast: true,
  cast_date: false,
};

/**
 * Process a CSV file
 */
export async function processCsvFile<T = any>(
  filePath: string,
  processor: (records: T[]) => Promise<void>
): Promise<void> {
  const fs = await import('fs');
  const { parse } = await import('csv-parse/sync');

  console.log(`Processing CSV file: ${filePath}`);

  const fileContent = await fs.promises.readFile(filePath, 'utf-8');
  const records: T[] = parse(fileContent, CSV_PARSE_OPTIONS);

  console.log(`Found ${records.length} records in CSV`);
  await processor(records);
}

/**
 * Common lead field formatters
 */
export const LeadFormatters = {
  formatName: (name: string | undefined | null): string => {
    if (!name) return '';
    return name
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  formatPhone: (phone: string | undefined | null): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  },

  formatZipCode: (zip: string | number | undefined | null): string => {
    if (!zip) return '';
    const zipStr = zip.toString();
    // Handle decimal zip codes (e.g., 12345.0 -> 12345)
    return zipStr.includes('.') ? zipStr.split('.')[0] : zipStr;
  },

  formatDate: (date: string | Date | undefined | null): Date | null => {
    if (!date) return null;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  },
};

/**
 * Deduplicate leads by a key
 */
export async function deduplicateLeads<T extends { [key: string]: any }>(
  leads: T[],
  keyField: keyof T
): Promise<T[]> {
  const seen = new Set<any>();
  const deduplicated: T[] = [];

  for (const lead of leads) {
    const key = lead[keyField];
    if (key && !seen.has(key)) {
      seen.add(key);
      deduplicated.push(lead);
    }
  }

  console.log(`Deduplicated ${leads.length} leads to ${deduplicated.length} unique leads`);
  return deduplicated;
}

/**
 * Log script summary statistics
 */
export function logSummary(stats: Record<string, number | string>): void {
  console.log('\n=== Summary ===');
  Object.entries(stats).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });
  console.log('===============\n');
}
