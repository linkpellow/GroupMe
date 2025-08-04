import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadModel from '../models/Lead';

// Load environment variables
dotenv.config();

async function addTestLead() {
  try {
    console.log('Adding test lead...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Create a test lead with current timestamp to make it new
    const testLead = new LeadModel({
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
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error adding test lead:', error);
    process.exit(1);
  }
}

// Run the script
addTestLead();
