"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Lead_1 = __importDefault(require("../models/Lead"));
// Load environment variables
dotenv_1.default.config();
async function fixNamesFinal() {
    try {
        console.log('Starting final name field correction...');
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI || '');
        console.log('Connected to MongoDB');
        // Find leads with possible last names in phone field and empty lastName field
        const query = {
            $and: [
                { phone: { $exists: true } },
                { phone: { $ne: '' } },
                { phone: { $not: /\d/ } }, // No digits in the phone field
                { lastName: { $in: ['', null, undefined] } }, // Empty last name
            ],
        };
        const badLeads = await Lead_1.default.find(query);
        console.log(`Found ${badLeads.length} leads with last names in phone fields`);
        let fixedCount = 0;
        let errorCount = 0;
        for (const lead of badLeads) {
            try {
                // Save original values for logging
                const origValues = {
                    name: lead.name,
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    phone: lead.phone,
                };
                console.log(`Processing lead: ${lead.name}, current values:`, origValues);
                // Use mongoose model directly instead of db.collection
                const updateResult = await Lead_1.default.updateOne({ _id: lead._id }, {
                    $set: {
                        lastName: lead.phone,
                        name: `${lead.firstName} ${lead.phone}`.trim(),
                    },
                });
                if (updateResult.modifiedCount > 0) {
                    console.log('Updated lead successfully!');
                    console.log('  Original:', origValues);
                    console.log('  Updated:', {
                        name: `${lead.firstName} ${lead.phone}`.trim(),
                        firstName: lead.firstName,
                        lastName: lead.phone,
                        phone: lead.phone, // Phone remains the same for now
                    });
                    fixedCount++;
                }
                else {
                    console.log(`No changes made to lead ${lead._id}`);
                }
            }
            catch (error) {
                console.error(`Error fixing lead ${lead._id instanceof mongoose_1.default.Types.ObjectId ? lead._id.toString() : String(lead._id)}:`, error);
                errorCount++;
            }
        }
        // Now try to recover phone numbers from notes for leads with specific patterns
        console.log('\nAttempting to recover phone numbers from lead notes...');
        const phoneFixCount = await fixPhoneNumbersFromNotes();
        console.log(`\nFinished name fixing process. Results: ${fixedCount} names fixed, ${phoneFixCount} phone numbers recovered, ${errorCount} errors`);
    }
    catch (error) {
        console.error('Error in fix-names-final script:', error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log('MongoDB connection closed');
    }
}
// Helper function to extract phone numbers from notes
async function fixPhoneNumbersFromNotes() {
    let fixedCount = 0;
    try {
        // Look for leads with bidType "exclusive" that likely have been fixed in phase 1
        const query = {
            bidType: 'exclusive',
            phone: { $not: /\d{3}/ }, // Phone doesn't contain at least 3 digits
        };
        const leads = await Lead_1.default.find(query);
        console.log(`Found ${leads.length} leads with potential phone number issues`);
        for (const lead of leads) {
            try {
                // Try to extract phone from notes
                let phoneNumber = null;
                if (lead.notes) {
                    try {
                        // Try parsing notes as JSON
                        const notesObj = typeof lead.notes === 'string' ? JSON.parse(lead.notes) : lead.notes;
                        // Check for phone in various formats
                        phoneNumber =
                            notesObj.phone ||
                                notesObj.phone_number ||
                                notesObj.phoneNumber ||
                                notesObj.mobile ||
                                notesObj.cell;
                        // If we found a phone number, update the lead
                        if (phoneNumber && typeof phoneNumber === 'string' && phoneNumber.length >= 10) {
                            console.log(`Found phone number ${phoneNumber} for lead ${lead.name}`);
                            // Use mongoose model directly
                            const updateResult = await Lead_1.default.updateOne({ _id: lead._id }, { $set: { phone: phoneNumber } });
                            if (updateResult.modifiedCount > 0) {
                                console.log(`Updated phone for lead ${lead.name} to ${phoneNumber}`);
                                fixedCount++;
                            }
                        }
                    }
                    catch (e) {
                        // Not valid JSON or other parsing error, continue
                        console.log(`Could not parse notes for lead ${lead.name}`);
                    }
                }
            }
            catch (error) {
                console.error(`Error fixing phone for lead ${lead._id instanceof mongoose_1.default.Types.ObjectId ? lead._id.toString() : String(lead._id)}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Error in fixPhoneNumbersFromNotes:', error);
    }
    return fixedCount;
}
// Run the final fix
fixNamesFinal().catch(console.error);
