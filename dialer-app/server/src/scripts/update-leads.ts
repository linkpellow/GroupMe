import mongoose from 'mongoose';
import LeadModel from '../models/Lead';

async function updateLeads() {
  try {
    await mongoose.connect(
      'mongodb+srv://linkpellowinsurance:9526Toast$@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow'
    );
    console.log('Connected to MongoDB');

    // Update Walter Currence's lead
    await LeadModel.findOneAndUpdate(
      {
        $or: [
          { phone: '8645907432' },
          { name: 'Walter Currence' },
          { name: 'Unknown Name', phone: '8645907432' },
        ],
      },
      {
        $set: {
          name: 'Walter Currence',
          firstName: 'Walter',
          lastName: 'Currence',
          phone: '8645907432',
          email: 'waltercurrence@gmail.com',
          state: 'SC',
          city: 'Greenville',
          zipcode: '29601',
          dob: '1978-11-12',
          height: '5\'11"',
          weight: '195',
          gender: 'Male',
          status: 'New',
          disposition: '',
          notes: 'Imported from NextGen\nCampaign: Spring Campaign\nLocation: Greenville, SC 29601',
        },
      },
      { upsert: true }
    );
    console.log('Updated Walter Currence lead');

    // Update Sarah Poole's lead
    await LeadModel.findOneAndUpdate(
      {
        $or: [
          { phone: '9195648321' },
          { name: 'Sarah Poole' },
          { name: 'Unknown Name', phone: '9195648321' },
        ],
      },
      {
        $set: {
          name: 'Sarah Poole',
          firstName: 'Sarah',
          lastName: 'Poole',
          phone: '9195648321',
          email: 'sarahpoole@gmail.com',
          state: 'NC',
          city: 'Raleigh',
          zipcode: '27601',
          dob: '1989-04-15',
          height: '5\'4"',
          weight: '135',
          gender: 'Female',
          status: 'New',
          disposition: '',
          notes: 'Imported from NextGen\nCampaign: Spring Campaign\nLocation: Raleigh, NC 27601',
        },
      },
      { upsert: true }
    );
    console.log('Updated Sarah Poole lead');

    // Update Morgan Deshetler's lead
    await LeadModel.findOneAndUpdate(
      {
        $or: [
          { phone: '7578690528' },
          { name: 'Morgan Deshetler' },
          { name: 'Unknown Name', phone: '7578690528' },
        ],
      },
      {
        $set: {
          name: 'Morgan Deshetler',
          firstName: 'Morgan',
          lastName: 'Deshetler',
          phone: '7578690528',
          email: 'suburbia757@gmail.com',
          state: 'VA',
          city: 'Virginia Beach',
          zipcode: '23464',
          dob: '1992-08-23',
          height: '5\'6"',
          weight: '145',
          gender: 'Female',
          status: 'New',
          disposition: '',
          notes:
            'Imported from NextGen\nCampaign: Spring Campaign\nLocation: Virginia Beach, VA 23464',
        },
      },
      { upsert: true }
    );
    console.log('Updated Morgan Deshetler lead');

    // Update any remaining Unknown Name leads from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await LeadModel.updateMany(
      {
        name: 'Unknown Name',
        createdAt: { $gte: today },
      },
      {
        $set: {
          status: 'New',
          disposition: '',
          notes: 'Imported from NextGen\nCampaign: Spring Campaign',
        },
      }
    );
    console.log('Updated remaining Unknown Name leads from today');

    console.log('All leads updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating leads:', error);
    process.exit(1);
  }
}

updateLeads();
