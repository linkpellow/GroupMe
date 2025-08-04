import axios from 'axios';
import { ILead } from '../models/Lead';
import { IUser } from '../models/User';
import mongoose from 'mongoose';

export async function importRingyLeads(adminUser: IUser) {
  try {
    const ringyAuthToken = process.env.RINGY_AUTH_TOKEN;
    const ringySid = process.env.RINGY_SID;

    if (!ringyAuthToken || !ringySid) {
      throw new Error('Ringy credentials not configured');
    }

    console.log('Testing Ringy API endpoints...');

    // Try different possible endpoints
    const endpoints = [
      'https://app.ringy.com/api/v1/leads',
      'https://app.ringy.com/api/leads',
      'https://app.ringy.com/api/public/leads',
    ];

    let response;
    let workingEndpoint;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        response = await axios.get(endpoint, {
          params: {
            sid: ringySid,
            authToken: ringyAuthToken,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ringyAuthToken}`,
            'X-SID': ringySid,
          },
        });
        console.log(`Success with endpoint ${endpoint}`);
        workingEndpoint = endpoint;
        break;
      } catch (error: any) {
        console.log(`Error with endpoint ${endpoint}:`, error.response?.data || error.message);
      }
    }

    if (!response || !workingEndpoint) {
      throw new Error(
        'Could not find working Ringy API endpoint. Please check credentials and API documentation.'
      );
    }

    console.log('Response from Ringy:', response.data);

    const ringyLeads = Array.isArray(response.data) ? response.data : [response.data];
    console.log(`Processing ${ringyLeads.length} leads from Ringy`);

    const stats = {
      totalProcessed: 0,
      newLeads: 0,
      updatedLeads: 0,
      errors: 0,
    };

    const Lead = mongoose.model<ILead>('Lead');

    for (const lead of ringyLeads) {
      try {
        const existingLead = await Lead.findOne({ phone: lead.phone });

        const leadData = {
          name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
          phone: lead.phone,
          email: lead.email || '',
          status: 'New',
          source: 'Ringy',
          notes: `Imported from Ringy\nPhone: ${lead.phone}\nEmail: ${lead.email || 'N/A'}\nStatus: ${lead.status || 'New'}`,
          assignedTo: adminUser._id,
        };

        if (existingLead) {
          await Lead.findByIdAndUpdate(existingLead._id, leadData);
          stats.updatedLeads++;
        } else {
          await Lead.create(leadData);
          stats.newLeads++;
        }
        stats.totalProcessed++;
      } catch (error) {
        console.error('Error processing lead:', error);
        stats.errors++;
      }
    }

    return {
      success: true,
      message: `Imported ${stats.totalProcessed} leads (${stats.newLeads} new, ${stats.updatedLeads} updated)`,
      stats,
    };
  } catch (error: any) {
    console.error('Error fetching leads from Ringy:', error.response?.data || error.message);
    throw new Error('Failed to import leads from Ringy. Check server logs for details.');
  }
}
