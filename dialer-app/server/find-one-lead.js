const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), 'dialer-app/server/.env.local') });
const mongoose = require('mongoose');
const Lead = require('./dist/server/src/models/Lead').default;

const findOneLead = async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not defined');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected.');

    // Find one lead that has a phone number
    const lead = await Lead.findOne({ phone: { $ne: null } });

    if (lead) {
      console.log('Found lead:');
      console.log(`  ID: ${lead._id}`);
      console.log(`  Name: ${lead.firstName} ${lead.lastName}`);
      console.log(`  Phone: ${lead.phone}`);
      console.log(`  State: ${lead.state}`);
    } else {
      console.log('No leads with a phone number found in the database.');
    }

  } catch (error) {
    console.error('Error finding lead:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

findOneLead(); 