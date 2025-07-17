import axios from 'axios';
import UserModel from '../models/User';
import LeadModel from '../models/Lead';

const RINGY_API = {
  baseURL: 'https://app.ringy.com/api/public',
  sid: 'iS8buecsrip7k4o82elrluc1kyq6orgm',
  authToken: '0vzxxro9mdg8zo8b2x6177ikfhv86lck',
};

export async function importRingyLeads() {
  try {
    console.log('Starting Ringy lead import...');

    // Get admin user for lead assignment
    const adminUser = await UserModel.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found to assign leads to');
    }

    // Make request to Ringy API
    const response = await axios.post(`${RINGY_API.baseURL}/leads/new-lead`, {
      sid: RINGY_API.sid,
      authToken: RINGY_API.authToken,
    });

    console.log('Ringy API Response:', response.data);

    if (response.data && response.data.vendorResponseId) {
      // Create a lead in our system to track the import
      const lead = await LeadModel.create({
        name: 'Ringy Import',
        email: `ringy-${Date.now()}@import.com`,
        phone: '0000000000',
        status: 'New',
        source: 'Ringy Import',
        notes: `Import successful. Vendor Response ID: ${response.data.vendorResponseId}`,
        assignedTo: adminUser._id,
      });

      return {
        success: true,
        message: 'Successfully imported from Ringy',
        leadId: lead._id,
        vendorResponseId: response.data.vendorResponseId,
      };
    }

    throw new Error('Invalid response from Ringy API');
  } catch (error) {
    console.error('Error importing from Ringy:', error);
    throw error;
  }
}
