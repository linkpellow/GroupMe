"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const DialCount_1 = __importDefault(require("../../models/DialCount"));
const phoneUtils_1 = require("../../../../shared/utils/phoneUtils");
// Load environment variables
const envPath = path_1.default.resolve(__dirname, '..', '..', '.env.local');
dotenv_1.default.config({ path: envPath });
const MONGO_URI = process.env.MONGODB_URI;
// COPIED FROM shared/utils/phoneUtils.ts TO AVOID PATH ISSUES - NOW REMOVED
// const normalizePhone = (phone: string | undefined | null): string => {
//   if (!phone) return '';
//   return phone.replace(/[^\d]/g, '').slice(-10);
// };
async function migrateDialCounts() {
    if (!MONGO_URI) {
        console.error('MongoDB URI not found in environment variables.');
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log('MongoDB connected for migration.');
        const allCounts = await DialCount_1.default.find({}).lean();
        let updatedCount = 0;
        const operations = [];
        const seenKeys = new Map();
        console.log(`Found ${allCounts.length} records to process...`);
        for (const doc of allCounts) {
            const originalPhone = doc.phone;
            const normalized = (0, phoneUtils_1.normalizePhone)(originalPhone);
            if (originalPhone === normalized && !seenKeys.has(`${doc.userId}-${normalized}`)) {
                seenKeys.set(`${doc.userId}-${normalized}`, doc.count);
                continue;
            }
            const existingCount = seenKeys.get(`${doc.userId}-${normalized}`) || 0;
            const newCount = existingCount + doc.count;
            seenKeys.set(`${doc.userId}-${normalized}`, newCount);
        }
        // Clear the collection
        await DialCount_1.default.deleteMany({});
        console.log('Cleared existing dialcounts collection.');
        // Insert the merged records
        const newDocs = [];
        for (const [key, count] of seenKeys.entries()) {
            const [userId, phone] = key.split('-');
            newDocs.push({
                userId: new mongoose_1.default.Types.ObjectId(userId),
                phone: phone,
                count: count,
                lastDialedAt: new Date(),
            });
        }
        if (newDocs.length > 0) {
            await DialCount_1.default.insertMany(newDocs);
            updatedCount = newDocs.length;
            console.log(`Successfully inserted ${updatedCount} merged and normalized records.`);
        }
        else {
            console.log('No records needed to be inserted.');
        }
        console.log(`Migration complete. ${updatedCount} records in collection.`);
    }
    catch (error) {
        console.error('An error occurred during migration:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('MongoDB disconnected.');
    }
}
migrateDialCounts();
