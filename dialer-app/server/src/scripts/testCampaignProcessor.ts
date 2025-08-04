import { processCampaigns } from '../services/campaignScheduler';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer_app');
    console.log('Connected to MongoDB');

    console.log('Running campaign processor manually...');
    await processCampaigns();
    console.log('Campaign processor completed successfully');

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error running campaign processor:', error);
  }
}

// Run the main function
main().catch(console.error);
