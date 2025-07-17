import { Request, Response } from 'express';
import axios from 'axios';
import LeadModel from '../models/Lead';
import UserModel from '../models/User';

// Environment variables for Ringy API authentication
const RINGY_SID = process.env.RINGY_SID || 'iS8buecsrip7k4o82elrluc1kyq6orgm';
const RINGY_AUTH_TOKEN = process.env.RINGY_AUTH_TOKEN || '0vzxxro9mdg8zo8b2x6177ikfhv86lck';
const RINGY_API_BASE_URL = 'https://app.ringy.com/api/v1';

// Function to sync all leads from Ringy
export const syncRingyLeads = async () => {
  try {
    console.log('Starting Ringy leads sync...');
    console.log('Using Ringy credentials:', {
      sid: RINGY_SID.substring(0, 4) + '...',
      auth_token: RINGY_AUTH_TOKEN.substring(0, 4) + '...',
    });

    // Get the admin user to assign leads to
    const adminUser = await UserModel.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found to assign leads to');
    }

    // Make request to Ringy API to get all leads
    console.log('Making request to Ringy API...');

    // First, get an access token
    const authResponse = await axios.post(`${RINGY_API_BASE_URL}/auth/token`, {
      sid: RINGY_SID,
      auth_token: RINGY_AUTH_TOKEN,
    });

    console.log('Auth response:', {
      status: authResponse.status,
      data: authResponse.data,
    });

    const accessToken = authResponse.data.access_token;

    // Now get the leads
    const response = await axios.get(`${RINGY_API_BASE_URL}/leads`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('Ringy API response status:', response.status);
    console.log('Ringy API response data type:', typeof response.data);
    console.log(
      'Ringy API response data preview:',
      JSON.stringify(response.data).substring(0, 200)
    );

    const leads = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data.data)
        ? response.data.data
        : Array.isArray(response.data.leads)
          ? response.data.leads
          : [];

    console.log(`Received ${leads.length} leads from Ringy`);

    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process each lead
    for (const lead of leads) {
      try {
        console.log('Processing lead:', {
          id: lead.id || lead._id,
          name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          phone: lead.phone || lead.phoneNumber,
        });

        // Check if lead already exists
        const existingLead = await LeadModel.findOne({
          $or: [{ ringyId: lead.id || lead._id }, { phone: lead.phone || lead.phoneNumber }],
        });

        if (!existingLead) {
          // Create new lead
          await LeadModel.create({
            name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            phone: lead.phone || lead.phoneNumber,
            email:
              lead.email || `${(lead.phone || lead.phoneNumber).replace(/\D/g, '')}@noemail.com`,
            status: mapRingyStatus(lead.status),
            notes: lead.notes || lead.description || '',
            assignedTo: adminUser._id,
            source: 'ringy',
            ringyId: lead.id || lead._id,
          });
          importedCount++;
          console.log(`Created new lead: ${lead.id || lead._id}`);
        } else {
          // Update existing lead
          existingLead.status = mapRingyStatus(lead.status);
          existingLead.notes = lead.notes || lead.description || existingLead.notes;
          await existingLead.save();
          updatedCount++;
          console.log(`Updated existing lead: ${lead.id || lead._id}`);
        }
      } catch (error) {
        errorCount++;
        console.error('Error processing lead:', error);
        console.error('Lead data:', lead);
      }
    }

    console.log(
      `Sync completed. Imported ${importedCount} new leads, updated ${updatedCount} existing leads, ${errorCount} errors.`
    );
    return { importedCount, updatedCount, errorCount };
  } catch (error) {
    console.error('Error syncing leads from Ringy:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
    }
    throw error;
  }
};

// Helper function to map Ringy status to our status
const mapRingyStatus = (
  ringyStatus: string
): 'New' | 'Contacted' | 'Follow-up' | 'Won' | 'Lost' => {
  const statusMap: {
    [key: string]: 'New' | 'Contacted' | 'Follow-up' | 'Won' | 'Lost';
  } = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Follow-up',
    won: 'Won',
    lost: 'Lost',
    follow_up: 'Follow-up',
  };
  return statusMap[ringyStatus?.toLowerCase()] || 'New';
};

// Endpoint to trigger lead sync
export const triggerRingySync = async (req: Request, res: Response) => {
  try {
    const result = await syncRingyLeads();
    res.json({
      message: 'Ringy leads sync completed successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error triggering Ringy sync:', error);
    res.status(500).json({
      message: 'Error syncing leads from Ringy',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: axios.isAxiosError(error)
        ? {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
          }
        : undefined,
    });
  }
};

// Existing webhook handler
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, status, notes } = req.body;

    // Get admin user to assign the lead to
    const adminUser = await UserModel.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found to assign lead to');
    }

    // Create new lead in our database
    const lead = await LeadModel.create({
      name,
      phone,
      email,
      status: status || 'New',
      notes,
      assignedTo: adminUser._id,
      source: 'ringy',
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Ringy webhook error:', error);
    res.status(500).json({ message: 'Error processing webhook' });
  }
};
