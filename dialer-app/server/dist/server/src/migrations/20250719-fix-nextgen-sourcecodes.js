"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Lead_1 = __importDefault(require("../models/Lead"));
/**
 * Migration to fix NextGen lead source codes
 *
 * This migration:
 * 1. Finds all leads with source='NextGen' and sourceCode='nextgen' or missing
 * 2. Attempts to extract campaign info from notes or other fields
 * 3. Updates sourceCode with meaningful campaign/vendor information
 */
async function fixNextGenSourceCodes() {
    try {
        console.log('Starting NextGen source code migration...');
        // Connect to MongoDB if not already connected
        if (mongoose_1.default.connection.readyState !== 1) {
            await mongoose_1.default.connect(process.env.MONGODB_URI || '');
            console.log('Connected to MongoDB');
        }
        // Find all NextGen leads with generic or missing source codes
        const leads = await Lead_1.default.find({
            source: 'NextGen',
            $or: [
                { sourceCode: { $exists: false } },
                { sourceCode: null },
                { sourceCode: '' },
                { sourceCode: 'nextgen' },
                { sourceCode: 'NextGen' }
            ]
        });
        console.log(`Found ${leads.length} NextGen leads to fix`);
        let updatedCount = 0;
        let skippedCount = 0;
        for (const lead of leads) {
            try {
                let newSourceCode = null;
                // Try to extract campaign info from notes
                if (lead.notes) {
                    // Look for campaign name in notes
                    const campaignMatch = lead.notes.match(/Campaign:\s*([^\n]+)/i);
                    if (campaignMatch) {
                        newSourceCode = campaignMatch[1].trim();
                    }
                    // Try to parse JSON in notes (some old imports stored webhook data as JSON)
                    if (!newSourceCode) {
                        try {
                            const noteData = JSON.parse(lead.notes);
                            if (noteData.campaign_name) {
                                newSourceCode = noteData.campaign_name;
                            }
                            else if (noteData.vendor_name) {
                                newSourceCode = noteData.vendor_name;
                            }
                        }
                        catch (e) {
                            // Not JSON, that's ok
                        }
                    }
                }
                // Try campaignName field if it exists
                if (!newSourceCode && lead.campaignName) {
                    newSourceCode = lead.campaignName;
                }
                // Try vendorName field if it exists  
                if (!newSourceCode && lead.vendorName) {
                    newSourceCode = lead.vendorName;
                }
                // If we found a source code, update the lead
                if (newSourceCode && newSourceCode !== 'Unknown Campaign') {
                    await Lead_1.default.updateOne({ _id: lead._id }, { sourceCode: newSourceCode });
                    updatedCount++;
                    console.log(`Updated lead ${lead._id}: sourceCode = "${newSourceCode}"`);
                }
                else {
                    skippedCount++;
                }
            }
            catch (error) {
                console.error(`Error processing lead ${lead._id}:`, error);
                skippedCount++;
            }
        }
        console.log('\nMigration complete!');
        console.log(`Updated: ${updatedCount} leads`);
        console.log(`Skipped: ${skippedCount} leads (no campaign info found)`);
        return {
            success: true,
            updated: updatedCount,
            skipped: skippedCount,
            total: leads.length
        };
    }
    catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
// Run the migration if called directly
if (require.main === module) {
    fixNextGenSourceCodes()
        .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}
exports.default = fixNextGenSourceCodes;
