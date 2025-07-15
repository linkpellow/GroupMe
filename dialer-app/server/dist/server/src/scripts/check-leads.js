"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Lead_1 = __importDefault(require("../models/Lead"));
const scriptUtils_1 = require("../utils/scriptUtils");
async function checkLeads() {
    // Get total count
    const totalCount = await Lead_1.default.countDocuments();
    console.log(`Total leads in database: ${totalCount}`);
    // Get count by source
    const sourceStats = await Lead_1.default.aggregate([
        {
            $group: {
                _id: '$source',
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
    ]);
    console.log('\nLeads by source:');
    sourceStats.forEach((stat) => {
        console.log(`  ${stat._id || 'No Source'}: ${stat.count}`);
    });
    // Get recently created leads
    const recentLeads = await Lead_1.default.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName source createdAt');
    console.log('\nRecent leads:');
    recentLeads.forEach((lead) => {
        console.log(`  ${lead.firstName} ${lead.lastName} - ${lead.source} - ${(0, scriptUtils_1.formatDate)(lead.createdAt)}`);
    });
    // Check for leads with missing data
    const missingData = await Lead_1.default.countDocuments({
        $or: [
            { firstName: { $exists: false } },
            { lastName: { $exists: false } },
            { phone: { $exists: false } },
            { source: { $exists: false } },
        ],
    });
    console.log(`\nLeads with missing data: ${missingData}`);
}
// Run the script
(0, scriptUtils_1.runScript)('Lead Database Check', checkLeads);
