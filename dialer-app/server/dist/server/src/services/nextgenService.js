"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncNextGenLeads = syncNextGenLeads;
exports.processNextGenCSV = processNextGenCSV;
const User_1 = __importDefault(require("../models/User"));
const Lead_1 = __importDefault(require("../models/Lead"));
async function syncNextGenLeads() {
    try {
        console.log('Starting NextGen leads sync...');
        // Get admin user for lead assignment
        const adminUser = await User_1.default.findOne({ role: 'admin' });
        if (!adminUser) {
            throw new Error('No admin user found to assign leads to');
        }
        // Since NextGen doesn't provide a direct API endpoint for fetching leads,
        // we'll need to get the leads from their system through their provided method
        // For now, we'll return instructions for manual sync
        return {
            success: true,
            message: 'NextGen leads sync requires manual action',
            instructions: {
                title: 'How to sync existing leads:',
                steps: [
                    '1. Log into your NextGen account',
                    '2. Export your leads to a CSV file',
                    '3. Send the CSV file to our support team at support@crokodial.com',
                    '4. We will process the file and import all leads into your pipeline',
                ],
                note: 'This is a one-time process to get your existing leads into the system. After this, all new leads will be automatically synced through the webhook.',
            },
        };
    }
    catch (error) {
        console.error('Error in NextGen sync process:', error);
        throw error;
    }
}
// Function to process a CSV file of leads
async function processNextGenCSV(leads) {
    try {
        const adminUser = await User_1.default.findOne({ role: 'admin' });
        if (!adminUser) {
            throw new Error('No admin user found to assign leads to');
        }
        let importedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        for (const lead of leads) {
            try {
                // Check if lead already exists
                const existingLead = await Lead_1.default.findOne({
                    $or: [{ nextgenId: lead.id }, { phone: lead.phone }],
                });
                const leadData = {
                    name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
                    phone: lead.phone,
                    email: lead.email || `${Date.now()}@noemail.com`,
                    status: 'New',
                    source: 'NextGen',
                    notes: lead.notes || JSON.stringify(lead),
                    assignedTo: adminUser._id,
                    nextgenId: lead.id,
                };
                if (!existingLead) {
                    // Create new lead
                    await Lead_1.default.create(leadData);
                    importedCount++;
                    console.log(`Created new lead: ${lead.id}`);
                }
                else {
                    // Update existing lead
                    await Lead_1.default.findByIdAndUpdate(existingLead._id, leadData);
                    updatedCount++;
                    console.log(`Updated existing lead: ${lead.id}`);
                }
            }
            catch (error) {
                errorCount++;
                console.error('Error processing lead:', error);
                console.error('Lead data:', lead);
            }
        }
        return {
            success: true,
            message: `Successfully processed ${importedCount + updatedCount} leads (${importedCount} new, ${updatedCount} updated)`,
            stats: {
                imported: importedCount,
                updated: updatedCount,
                errors: errorCount,
            },
        };
    }
    catch (error) {
        console.error('Error processing NextGen CSV:', error);
        throw error;
    }
}
