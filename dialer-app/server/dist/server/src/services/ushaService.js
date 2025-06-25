"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUshaLeads = fetchUshaLeads;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const Lead_1 = __importDefault(require("../models/Lead"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
// Create an axios instance specifically for USHA API
const ushaApi = axios_1.default.create({
    baseURL: 'https://api.ushamarketplace.com',
    headers: {
        'Content-Type': 'application/json',
    },
});
// Test the API connection first
async function testUshaConnection() {
    try {
        console.log('Testing USHA API connection...');
        const response = await ushaApi.get('/v1/status');
        console.log('USHA API Status:', response.data);
        return response.data;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('USHA API Test Failed:', error.message);
        }
        else {
            console.error('USHA API Test Failed:', error);
        }
        throw error;
    }
}
async function fetchUshaLeads() {
    try {
        console.log('Starting USHA Marketplace lead fetch process...');
        // Test connection first
        await testUshaConnection();
        // Get admin user for lead assignment
        const adminUser = await User_1.default.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error('No admin user found');
            throw new Error('No admin user found to assign leads to');
        }
        console.log('Making request to USHA Marketplace API...');
        // Make the API request with credentials in the body
        const response = await ushaApi.post('/v1/leads/fetch', {
            sid: 'iS8buecsrip7k4o82elrluc1kyq6orgm',
            authToken: '0vzxxro9mdg8zo8b2x6177ikfhv86lck',
        });
        console.log('Response received:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
        });
        if (response.status === 200 && response.data) {
            // Create a lead in our system to track the sync
            const syncLead = await Lead_1.default.create({
                name: 'USHA Marketplace Sync',
                email: 'sync@ushamarketplace.com',
                phone: '0000000000',
                status: 'New',
                source: 'USHA Marketplace',
                notes: `Sync successful. Response ID: ${response.data.vendorResponseId || 'N/A'}`,
                assignedTo: adminUser._id,
            });
            console.log('Created sync tracking lead:', syncLead._id);
            return {
                success: true,
                message: 'Successfully synced with USHA Marketplace',
                data: response.data,
                syncId: syncLead._id,
            };
        }
        else {
            throw new Error(`Unexpected response: ${response.status} ${response.statusText}`);
        }
    }
    catch (error) {
        console.error('Error in fetchUshaLeads:', error);
        if (axios_1.default.isAxiosError(error)) {
            const response = error.response;
            console.error('Full error response:', {
                status: response?.status,
                statusText: response?.statusText,
                data: response?.data,
                headers: response?.headers,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    baseURL: error.config?.baseURL,
                },
            });
            if (response?.status === 400) {
                throw new Error('Invalid request format - please check the request parameters');
            }
            else if (response?.status === 401) {
                throw new Error('Authentication failed - please check your credentials');
            }
            else if (response?.status === 403) {
                throw new Error('Access forbidden - please verify your access permissions');
            }
            else if (response?.status === 429) {
                throw new Error('Rate limit exceeded - please try again later');
            }
            else if (response?.status === 500) {
                throw new Error('USHA Marketplace server error - please try again later');
            }
            throw new Error(`USHA API Error: ${response?.status} - ${JSON.stringify(response?.data)}`);
        }
        throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
}
