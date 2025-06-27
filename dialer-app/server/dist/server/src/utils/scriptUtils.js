"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadFormatters = exports.CSV_PARSE_OPTIONS = void 0;
exports.connectToDatabase = connectToDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.processBatch = processBatch;
exports.runScript = runScript;
exports.formatDate = formatDate;
exports.safeJsonParse = safeJsonParse;
exports.processCsvFile = processCsvFile;
exports.deduplicateLeads = deduplicateLeads;
exports.logSummary = logSummary;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Connect to MongoDB with retry logic
 */
async function connectToDatabase(dbName) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer';
    const uri = dbName ? mongoUri.replace(/\/[^/]+$/, `/${dbName}`) : mongoUri;
    try {
        await mongoose_1.default.connect(uri);
        console.log(`✅ Connected to MongoDB: ${uri}`);
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}
/**
 * Disconnect from MongoDB gracefully
 */
async function disconnectDatabase() {
    try {
        await mongoose_1.default.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
    catch (error) {
        console.error('❌ Error disconnecting from MongoDB:', error);
    }
}
/**
 * Process items in batches
 */
async function processBatch(items, batchSize, processor, itemName = 'items') {
    console.log(`Processing ${items.length} ${itemName} in batches of ${batchSize}...`);
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const progress = Math.min(i + batchSize, items.length);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${i + 1}-${progress} of ${items.length}`);
        try {
            await processor(batch);
        }
        catch (error) {
            console.error(`Error processing batch at index ${i}:`, error);
            throw error;
        }
    }
}
/**
 * Standard script wrapper with error handling
 */
async function runScript(scriptName, scriptFunction) {
    console.log(`\n🚀 Starting ${scriptName}...`);
    console.log('='.repeat(50));
    const startTime = Date.now();
    try {
        await connectToDatabase();
        await scriptFunction();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('='.repeat(50));
        console.log(`✅ ${scriptName} completed successfully in ${duration}s\n`);
    }
    catch (error) {
        console.error(`\n❌ ${scriptName} failed:`, error);
        process.exit(1);
    }
    finally {
        await disconnectDatabase();
    }
}
/**
 * Format a date for consistent output
 */
function formatDate(date) {
    if (!date)
        return 'N/A';
    return new Date(date).toLocaleString();
}
/**
 * Safely parse JSON with error handling
 */
function safeJsonParse(jsonString, defaultValue) {
    try {
        return JSON.parse(jsonString);
    }
    catch {
        return defaultValue;
    }
}
/**
 * Common CSV parsing options
 */
exports.CSV_PARSE_OPTIONS = {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: true,
    cast_date: false,
};
/**
 * Process a CSV file
 */
async function processCsvFile(filePath, processor) {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const { parse } = await Promise.resolve().then(() => __importStar(require('csv-parse')));
    console.log(`Processing CSV file: ${filePath}`);
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const records = await new Promise((resolve, reject) => {
        parse(fileContent, exports.CSV_PARSE_OPTIONS, (err, output) => {
            if (err)
                reject(err);
            else
                resolve(output);
        });
    });
    console.log(`Found ${records.length} records in CSV`);
    await processor(records);
}
/**
 * Common lead field formatters
 */
exports.LeadFormatters = {
    formatName: (name) => {
        if (!name)
            return '';
        return name
            .trim()
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    },
    formatPhone: (phone) => {
        if (!phone)
            return '';
        return phone.replace(/\D/g, '');
    },
    formatZipCode: (zip) => {
        if (!zip)
            return '';
        const zipStr = zip.toString();
        // Handle decimal zip codes (e.g., 12345.0 -> 12345)
        return zipStr.includes('.') ? zipStr.split('.')[0] : zipStr;
    },
    formatDate: (date) => {
        if (!date)
            return null;
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
    },
};
/**
 * Deduplicate leads by a key
 */
async function deduplicateLeads(leads, keyField) {
    const seen = new Set();
    const deduplicated = [];
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
function logSummary(stats) {
    console.log('\n=== Summary ===');
    Object.entries(stats).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
    });
    console.log('===============\n');
}
