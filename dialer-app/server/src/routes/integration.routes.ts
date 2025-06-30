import express, { Router } from 'express';
import { API_SID } from '../services/apiConfig';
import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import Lead from '../models/Lead';
import { validateApiKey } from '../config/apiKeys';
import { fetchUshaLeads } from '../services/ushaService';
import { importRingyLeads } from '../services/ringyService';
import { importLeads } from '../scripts/import-nextgen-leads';
import UserModel from '../models/User';

const router: Router = Router();

interface NextGenLead {
  name: string;
  phone: string;
  email: string;
  notes?: string;
  firstName?: string;
  lastName?: string;
  state?: string;
  city?: string;
  zipcode?: string;
  height?: string;
  weight?: string;
  gender?: string;
  dob?: string;
  disposition?: string;
}

// Endpoint to verify API credentials
router.post('/verify', (req, res) => {
  const { sid } = req.body;

  if (sid !== API_SID) {
    return res.status(401).json({
      error: 'Invalid credentials',
      status: 'error',
    });
  }

  return res.json({
    status: 'success',
    message: 'API credentials verified successfully',
  });
});

// Endpoint to get API information
router.get('/info', (req, res) => {
  res.json({
    apiVersion: 'v1',
    endpoints: {
      leads: '/api/v1/leads',
      auth: '/api/v1/auth',
      calls: '/api/v1/calls',
    },
    baseUrl: process.env.API_BASE_URL || 'https://crokodial-2a1145cec713.herokuapp.com',
  });
});

// Helper function to format height
function formatHeight(height: string | undefined): string {
  if (!height) {
    return '';
  }

  // If already in correct format (e.g. "5'6"), return as is
  if (height.includes("'")) {
    return height;
  }

  // If just a number, assume it's inches and convert
  const inches = parseInt(height);
  if (!isNaN(inches)) {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}`;
  }

  return height;
}

// Helper function to format date
function formatDate(date: string | undefined): string {
  if (!date) {
    return '';
  }
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US');
  } catch {
    return date;
  }
}

// Webhook endpoint for NextGen lead integration
router.post('/nextgen', async (req: Request, res: Response) => {
  try {
    // Validate API credentials
    const sid = req.headers['sid'];
    const apiKey = req.headers['apikey'];

    // Hardcoded validation for now since we know the credentials
    if (
      !sid ||
      !apiKey ||
      sid !== 'crk_c615dc7de53e9a5dbf4ece635ad894f1' ||
      apiKey !== 'key_03a8c03fa7b634848bcb260e1a8d12849f9fe1965eefc7de7dc4221c746191da'
    ) {
      console.error('Invalid API credentials:', { sid, apiKey });
      return res.status(401).json({
        success: false,
        error: 'Invalid API credentials',
      });
    }

    // Get admin user for lead assignment
    const adminUser = await UserModel.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found');
    }

    // Handle both single and multiple leads
    const leads = Array.isArray(req.body) ? req.body : [req.body];
    const processedLeads = [];

    console.log('Processing NextGen leads:', {
      totalLeads: leads.length,
      firstLead: leads[0],
    });

    // Get the current highest order
    const lastLead = await Lead.findOne({ assignedTo: adminUser._id }).sort({
      order: -1,
    });
    let nextOrder = lastLead?.order !== undefined ? lastLead.order + 1 : 0;

    for (const lead of leads) {
      try {
        // Extract and format lead data
        const firstName = lead.firstName || lead.first_name || '';
        const lastName = lead.lastName || lead.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Name';
        const phone = lead.phone || lead.phone_number || '';
        const state = (lead.state || lead.state_code || '').toUpperCase();
        const city = lead.city || '';
        const zipcode = lead.zipcode || lead.zip || '';
        const dob = lead.dob || lead.date_of_birth || '';
        const height = lead.height || lead.height_inches || '';
        const weight = lead.weight || lead.weight_lbs || '';
        const gender = (lead.gender || '').toLowerCase();

        // Format date of birth
        const formattedDob = dob ? new Date(dob).toLocaleDateString() : '';

        // Format height
        const formattedHeight = height
          ? `${Math.floor(parseInt(height) / 12)}'${parseInt(height) % 12}"`
          : '';

        // Map NextGen fields to our schema format
        const leadData = {
          // Name fields
          firstName,
          lastName,
          name: fullName,

          // Contact fields
          phone,
          email: lead.email || lead.emailAddress || `${phone}@noemail.com`,

          // Location fields
          state: (state || '').toUpperCase().trim(),
          city: (city || '').trim(),
          zipcode: (zipcode || '').trim(),

          // Personal info
          dob: formattedDob,
          height: formattedHeight,
          weight,
          gender: gender.charAt(0).toUpperCase() + gender.slice(1),

          // Status and source
          status: 'New',
          source: 'NextGen',
          disposition: 'New Lead',

          // Assignment and order
          assignedTo: adminUser._id,
          order: nextOrder++,

          // Notes with golden badge and all available information
          notes: `🌟 New Lead\n\nImported from NextGen\nCampaign: ${lead.campaign_name || 'Unknown Campaign'}\nLocation: ${city}, ${state} ${zipcode}\nDOB: ${formattedDob}\nHeight: ${formattedHeight}\nWeight: ${weight}\nGender: ${gender.charAt(0).toUpperCase() + gender.slice(1)}\nOriginal Status: ${lead.status || 'Unknown'}\n${lead.notes || ''}`,
        };

        // Create or update the lead
        const existingLead = await Lead.findOne({
          $or: [{ phone }, { email: leadData.email }],
        });

        let savedLead;
        if (existingLead) {
          // Update existing lead
          savedLead = await Lead.findByIdAndUpdate(existingLead._id, leadData, {
            new: true,
          });
          console.log('Updated existing lead:', {
            id: existingLead._id,
            name: fullName,
            phone,
          });
        } else {
          // Create new lead
          savedLead = await Lead.create(leadData);
          console.log('Created new lead:', {
            id: savedLead._id,
            name: fullName,
            phone,
          });
        }

        processedLeads.push(savedLead);
      } catch (error) {
        console.error('Error processing lead:', error);
        console.error('Lead data:', lead);
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${processedLeads.length} leads`,
      processedLeads,
    });
  } catch (error) {
    console.error('NextGen webhook error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
});

// Import leads from NextGen
router.post('/import-nextgen', auth, async (req, res) => {
  try {
    const result = await importLeads(req.user?.id);
    res.json(result);
  } catch (error) {
    console.error('Error importing NextGen leads:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

// Import leads from Ringy
router.post('/import-ringy', auth, async (req, res) => {
  try {
    const adminUser = await UserModel.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found');
    }
    const result = await importRingyLeads(adminUser);
    res.json(result);
  } catch (error) {
    console.error('Error importing Ringy leads:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

// Import leads from Usha
router.post('/import-usha', auth, async (req, res) => {
  try {
    const result = await fetchUshaLeads();
    res.json(result);
  } catch (error) {
    console.error('Error importing Usha leads:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

export default router;
