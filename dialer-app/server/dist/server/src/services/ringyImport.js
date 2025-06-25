"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRingyLeads = importRingyLeads;
const axios_1 = __importDefault(require("axios"));
const User_1 = __importDefault(require("../models/User"));
const Lead_1 = __importDefault(require("../models/Lead"));
const RINGY_API = {
    baseURL: 'https://app.ringy.com/api/public',
    sid: 'iS8buecsrip7k4o82elrluc1kyq6orgm',
    authToken: '0vzxxro9mdg8zo8b2x6177ikfhv86lck',
};
async function importRingyLeads() {
    try {
        console.log('Starting Ringy lead import...');
        // Get admin user for lead assignment
        const adminUser = await User_1.default.findOne({ role: 'admin' });
        if (!adminUser) {
            throw new Error('No admin user found to assign leads to');
        }
        // Make request to Ringy API
        const response = await axios_1.default.post(`${RINGY_API.baseURL}/leads/new-lead`, {
            sid: RINGY_API.sid,
            authToken: RINGY_API.authToken,
        });
        console.log('Ringy API Response:', response.data);
        if (response.data && response.data.vendorResponseId) {
            // Create a lead in our system to track the import
            const lead = await Lead_1.default.create({
                name: 'Ringy Import',
                email: `ringy-${Date.now()}@import.com`,
                phone: '0000000000',
                status: 'New',
                source: 'Ringy Import',
                notes: `Import successful. Vendor Response ID: ${response.data.vendorResponseId}`,
                assignedTo: adminUser._id,
            });
            return {
                success: true,
                message: 'Successfully imported from Ringy',
                leadId: lead._id,
                vendorResponseId: response.data.vendorResponseId,
            };
        }
        throw new Error('Invalid response from Ringy API');
    }
    catch (error) {
        console.error('Error importing from Ringy:', error);
        throw error;
    }
}
