"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const campaignScheduler_1 = require("../services/campaignScheduler");
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
async function main() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer_app');
        console.log('Connected to MongoDB');
        console.log('Running campaign processor manually...');
        await (0, campaignScheduler_1.processCampaigns)();
        console.log('Campaign processor completed successfully');
        // Close the connection
        await mongoose_1.default.connection.close();
        console.log('MongoDB connection closed');
    }
    catch (error) {
        console.error('Error running campaign processor:', error);
    }
}
// Run the main function
main().catch(console.error);
