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
async function addTestLead() {
    try {
        console.log('Adding test lead...');
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI || '');
        console.log('Connected to MongoDB');
        // Create a test lead with current timestamp to make it new
        const testLead = new Lead_1.default({
            firstName: 'John',
            lastName: 'Smith',
            name: 'John Smith', // Required field
            email: 'john.smith@example.com',
            phone: '555-987-6543',
            bidType: 'exclusive',
            status: 'New', // Matches enum values
            source: 'NextGen',
            zipcode: '48201',
            state: 'MI',
            dob: '1985-06-15',
            height: '5\'10"',
            weight: '180',
            gender: 'Male',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        // Save the test lead
        await testLead.save();
        console.log('Test lead added successfully!');
        // Close the connection
        await mongoose_1.default.connection.close();
        console.log('MongoDB connection closed');
    }
    catch (error) {
        console.error('Error adding test lead:', error);
        process.exit(1);
    }
}
// Run the script
addTestLead();
