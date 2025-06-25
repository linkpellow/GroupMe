const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Lead = require('./dist/server/src/models/Lead').default;
const { normalizePhone } = require('../shared/utils/phoneUtils');

// --- Test Data ---
const TEST_LEAD_ID = '6840fc1390e58bbd260c1449';
const TEST_CAMPAIGN_ID = 'c0cbb0e0-3477-4d5c-bca3-e614709f6309';
const TEXTDRIP_API_TOKEN = process.env.TEXTDRIP_API_TOKEN;
// ---

// const normalizePhone = (raw) => {
//     const digits = raw.replace(/\D/g, '');
//     if (digits.length === 10) return `+1${digits}`;
//     if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
//     if (digits.startsWith('+')) return digits;
//     return `+${digits}`;
// };

const phoneToken = (phone) => {
    return crypto.createHash('sha256').update(normalizePhone(phone)).digest('hex');
};

const api = axios.create({
    baseURL: 'https://api.textdrip.com/api',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEXTDRIP_API_TOKEN}`,
    },
    timeout: 30000,
});

const runTest = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected.');

        console.log(`Finding lead with ID: ${TEST_LEAD_ID}`);
        const lead = await Lead.findById(TEST_LEAD_ID);
        if (!lead) {
            throw new Error(`Lead with ID ${TEST_LEAD_ID} not found.`);
        }
        console.log(`Found lead: ${lead.firstName} ${lead.lastName}`);
        
        // --- API Call Logic ---
        let contactId = lead.textdripContactId;
        if (!contactId) {
             console.warn(`Lead is missing textdripContactId. Creating one now...`);
             const contactPhone = normalizePhone(lead.phone || lead.phoneNumber || '');
             await api.post('/create-contact', {
                name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'CRM Contact',
                phone: contactPhone,
                email: lead.email || '',
             }, { headers: { 'phone-token': phoneToken(contactPhone) } });
             
             const res = await api.post('/get-contact-detail', { phone: contactPhone });
             if (res.data?.status && res.data?.contact) {
                contactId = res.data.contact.id || res.data.contact.contact_id;
                lead.textdripContactId = contactId;
                await lead.save();
                console.log(`Created and saved new Textdrip contact ID: ${contactId}`);
             } else {
                throw new Error('Failed to create or retrieve contact after creation.');
             }
        }

        const senderPhoneNumber = '+18136679756';
        const requestBody = {
            contact_id: contactId,
            campaign_id: TEST_CAMPAIGN_ID,
            already_scheduled_remove: false,
        };
        const requestHeaders = {
            'phone-token': phoneToken(senderPhoneNumber),
        };

        console.log('\n--- Sending Request to Textdrip ---');
        console.log('POST /add-campaign');
        console.log('Headers:', requestHeaders);
        console.log('Body:', JSON.stringify(requestBody, null, 2));
        
        const response = await api.post('/add-campaign', requestBody, { headers: requestHeaders });

        console.log('\n--- Received Response from Textdrip ---');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('\n--- TEST FAILED ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        await mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

runTest(); 