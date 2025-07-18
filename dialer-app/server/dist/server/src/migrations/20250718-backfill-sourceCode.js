"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const mongoose_1 = __importDefault(require("mongoose"));
const Lead_1 = __importDefault(require("../models/Lead"));
require("../config/envLoader");
(async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
        if (!mongoUri)
            throw new Error('MONGO_URI not defined');
        await mongoose_1.default.connect(mongoUri);
        console.log('[migration] Connected to MongoDB');
        const BATCH = 500;
        let updated = 0;
        while (true) {
            const leads = await Lead_1.default.find({
                $or: [{ sourceCode: { $exists: false } }, { sourceCode: null }, { sourceCode: '' }],
            })
                .limit(BATCH)
                .lean();
            if (leads.length === 0)
                break;
            const bulk = Lead_1.default.collection.initializeUnorderedBulkOp();
            for (const lead of leads) {
                const sourceHash = lead.vendorData?.data_source_hash ||
                    lead.vendorData?.source_hash ||
                    lead.notesMetadata?.source_hash ||
                    lead.notesMetadata?.originalData?.data_source_hash ||
                    lead.notesMetadata?.originalData?.source_hash;
                if (!sourceHash)
                    continue;
                bulk.find({ _id: lead._id }).updateOne({ $set: { sourceCode: sourceHash, updatedAt: new Date() } });
                updated++;
            }
            if (bulk.length > 0) {
                await bulk.execute();
                console.log(`[migration] Batch updated ${bulk.length} records`);
            }
        }
        console.log(`[migration] Completed – total leads updated: ${updated}`);
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (err) {
        console.error('[migration] Error', err);
        process.exit(1);
    }
})();
