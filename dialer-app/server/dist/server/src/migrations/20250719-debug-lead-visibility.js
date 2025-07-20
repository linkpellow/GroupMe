"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
require("../config/envLoader");
const Lead_1 = __importDefault(require("../models/Lead"));
/**
 * Debug Script: Analyze NextGen lead data for UI visibility issue
 */
async function debugLeadVisibility() {
    console.log('🔍 Starting NextGen lead visibility analysis...\n');
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        // Get one NextGen lead with complete structure
        console.log('=== SAMPLE NEXTGEN LEAD ===');
        const sampleLead = await Lead_1.default.findOne({ source: 'NextGen' });
        if (!sampleLead) {
            console.log('❌ No NextGen leads found in database');
            return;
        }
        console.log('sourceCode:', sampleLead.sourceCode);
        console.log('sourceHash:', sampleLead.sourceHash);
        console.log('campaign:', sampleLead.campaign);
        console.log('source:', sampleLead.source);
        console.log('firstName:', sampleLead.firstName);
        console.log('lastName:', sampleLead.lastName);
        // Get basic counts
        const totalNextGen = await Lead_1.default.countDocuments({ source: 'NextGen' });
        console.log('\nTotal NextGen leads:', totalNextGen);
        // Check multiple leads
        console.log('\n=== MULTIPLE LEAD SAMPLE (5 leads) ===');
        const leads = await Lead_1.default.find({ source: 'NextGen' })
            .select('sourceCode sourceHash firstName lastName')
            .limit(5);
        leads.forEach((lead, i) => {
            console.log(`Lead ${i + 1} (${lead.firstName} ${lead.lastName}):`);
            console.log('  sourceCode:', lead.sourceCode);
            console.log('  sourceHash:', lead.sourceHash);
            console.log('---');
        });
        // Get distinct values
        console.log('\n=== DISTINCT VALUES ===');
        const sourceCodeValues = await Lead_1.default.distinct('sourceCode', { source: 'NextGen' });
        console.log('Distinct sourceCode values:');
        sourceCodeValues.forEach(value => console.log('  -', JSON.stringify(value)));
        const sourceHashValues = await Lead_1.default.distinct('sourceHash', { source: 'NextGen' });
        console.log('\nDistinct sourceHash values:');
        sourceHashValues.forEach(value => console.log('  -', JSON.stringify(value)));
        // API Response simulation
        console.log('\n=== API RESPONSE SIMULATION ===');
        const apiLead = await Lead_1.default.findOne({ source: 'NextGen' });
        if (apiLead) {
            console.log('Raw Database Object (key fields):');
            const rawObj = apiLead.toObject();
            console.log('  sourceCode:', rawObj.sourceCode);
            console.log('  sourceHash:', rawObj.sourceHash);
            console.log('  campaign:', rawObj.campaign);
            console.log('\nSerialized API Response (key fields):');
            const jsonObj = apiLead.toJSON();
            console.log('  sourceCode:', jsonObj.sourceCode);
            console.log('  sourceHash:', jsonObj.sourceHash);
            console.log('  campaign:', jsonObj.campaign);
        }
        console.log('\n✅ Analysis completed successfully');
    }
    catch (error) {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
}
// Run analysis
debugLeadVisibility();
