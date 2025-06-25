"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.triggerRingySync = exports.syncRingyLeads = void 0;
const axios_1 = __importDefault(require("axios"));
const Lead_1 = __importDefault(require("../models/Lead"));
const User_1 = __importDefault(require("../models/User"));
// Environment variables for Ringy API authentication
const RINGY_SID = process.env.RINGY_SID || 'iS8buecsrip7k4o82elrluc1kyq6orgm';
const RINGY_AUTH_TOKEN = process.env.RINGY_AUTH_TOKEN || '0vzxxro9mdg8zo8b2x6177ikfhv86lck';
const RINGY_API_BASE_URL = 'https://app.ringy.com/api/v1';
// Function to sync all leads from Ringy
const syncRingyLeads = async () => {
    try {
        console.log('Starting Ringy leads sync...');
        console.log('Using Ringy credentials:', {
            sid: RINGY_SID.substring(0, 4) + '...',
            auth_token: RINGY_AUTH_TOKEN.substring(0, 4) + '...',
        });
        // Get the admin user to assign leads to
        const adminUser = await User_1.default.findOne({ role: 'admin' });
        if (!adminUser) {
            throw new Error('No admin user found to assign leads to');
        }
        // Make request to Ringy API to get all leads
        console.log('Making request to Ringy API...');
        // First, get an access token
        const authResponse = await axios_1.default.post(`${RINGY_API_BASE_URL}/auth/token`, {
            sid: RINGY_SID,
            auth_token: RINGY_AUTH_TOKEN,
        });
        console.log('Auth response:', {
            status: authResponse.status,
            data: authResponse.data,
        });
        const accessToken = authResponse.data.access_token;
        // Now get the leads
        const response = await axios_1.default.get(`${RINGY_API_BASE_URL}/leads`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        console.log('Ringy API response status:', response.status);
        console.log('Ringy API response data type:', typeof response.data);
        console.log('Ringy API response data preview:', JSON.stringify(response.data).substring(0, 200));
        const leads = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data.data)
                ? response.data.data
                : Array.isArray(response.data.leads)
                    ? response.data.leads
                    : [];
        console.log(`Received ${leads.length} leads from Ringy`);
        let importedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        // Process each lead
        for (const lead of leads) {
            try {
                console.log('Processing lead:', {
                    id: lead.id || lead._id,
                    name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
                    phone: lead.phone || lead.phoneNumber,
                });
                // Check if lead already exists
                const existingLead = await Lead_1.default.findOne({
                    $or: [{ ringyId: lead.id || lead._id }, { phone: lead.phone || lead.phoneNumber }],
                });
                if (!existingLead) {
                    // Create new lead
                    await Lead_1.default.create({
                        name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
                        phone: lead.phone || lead.phoneNumber,
                        email: lead.email || `${(lead.phone || lead.phoneNumber).replace(/\D/g, '')}@noemail.com`,
                        status: mapRingyStatus(lead.status),
                        notes: lead.notes || lead.description || '',
                        assignedTo: adminUser._id,
                        source: 'ringy',
                        ringyId: lead.id || lead._id,
                    });
                    importedCount++;
                    console.log(`Created new lead: ${lead.id || lead._id}`);
                }
                else {
                    // Update existing lead
                    existingLead.status = mapRingyStatus(lead.status);
                    existingLead.notes = lead.notes || lead.description || existingLead.notes;
                    await existingLead.save();
                    updatedCount++;
                    console.log(`Updated existing lead: ${lead.id || lead._id}`);
                }
            }
            catch (error) {
                errorCount++;
                console.error('Error processing lead:', error);
                console.error('Lead data:', lead);
            }
        }
        console.log(`Sync completed. Imported ${importedCount} new leads, updated ${updatedCount} existing leads, ${errorCount} errors.`);
        return { importedCount, updatedCount, errorCount };
    }
    catch (error) {
        console.error('Error syncing leads from Ringy:', error);
        if (axios_1.default.isAxiosError(error)) {
            console.error('Axios error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                },
            });
        }
        throw error;
    }
};
exports.syncRingyLeads = syncRingyLeads;
// Helper function to map Ringy status to our status
const mapRingyStatus = (ringyStatus) => {
    const statusMap = {
        new: 'New',
        contacted: 'Contacted',
        qualified: 'Follow-up',
        won: 'Won',
        lost: 'Lost',
        follow_up: 'Follow-up',
    };
    return statusMap[ringyStatus?.toLowerCase()] || 'New';
};
// Endpoint to trigger lead sync
const triggerRingySync = async (req, res) => {
    try {
        const result = await (0, exports.syncRingyLeads)();
        res.json({
            message: 'Ringy leads sync completed successfully',
            ...result,
        });
    }
    catch (error) {
        console.error('Error triggering Ringy sync:', error);
        res.status(500).json({
            message: 'Error syncing leads from Ringy',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: axios_1.default.isAxiosError(error)
                ? {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                }
                : undefined,
        });
    }
};
exports.triggerRingySync = triggerRingySync;
// Existing webhook handler
const handleWebhook = async (req, res) => {
    try {
        const { name, phone, email, status, notes } = req.body;
        // Get admin user to assign the lead to
        const adminUser = await User_1.default.findOne({ role: 'admin' });
        if (!adminUser) {
            throw new Error('No admin user found to assign lead to');
        }
        // Create new lead in our database
        const lead = await Lead_1.default.create({
            name,
            phone,
            email,
            status: status || 'New',
            notes,
            assignedTo: adminUser._id,
            source: 'ringy',
        });
        res.status(201).json(lead);
    }
    catch (error) {
        console.error('Ringy webhook error:', error);
        res.status(500).json({ message: 'Error processing webhook' });
    }
};
exports.handleWebhook = handleWebhook;
