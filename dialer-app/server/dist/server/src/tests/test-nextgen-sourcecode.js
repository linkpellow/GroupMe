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
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3005/api';
// Read test payload
const testPayload = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/nextgen-webhook-payload.json'), 'utf-8'));
async function testSourceCodeMapping() {
    console.log('Testing NextGen webhook source code mapping...\n');
    try {
        // Send test webhook
        const response = await axios_1.default.post(`${API_BASE_URL}/webhooks/nextgen`, testPayload, {
            headers: {
                'Content-Type': 'application/json',
                'sid': process.env.NEXTGEN_SID || 'test-sid',
                'apikey': process.env.NEXTGEN_API_KEY || 'test-key'
            }
        });
        console.log('Response:', response.data);
        console.log('\nExpected source code:', testPayload.source_hash);
        // Verify the lead was created with correct source code
        if (response.data.leadId) {
            console.log('\n✅ Lead created successfully with ID:', response.data.leadId);
            console.log('Check the database to verify sourceCode is set to:', testPayload.source_hash);
            console.log('(NOT the campaign_name:', testPayload.campaign_name + ')');
        }
    }
    catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.error('\nMake sure:');
        console.error('1. Server is running on port 3005');
        console.error('2. NEXTGEN_SID and NEXTGEN_API_KEY are set in .env');
        process.exit(1);
    }
}
// Run the test
testSourceCodeMapping();
