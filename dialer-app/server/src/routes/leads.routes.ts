import express, { Request, Response, NextFunction, Router } from 'express';
import { check } from 'express-validator';
import { auth, isAdmin } from '../middleware/auth';
import LeadModel, { ILeadInput } from '../models/Lead';
import { fetchUshaLeads } from '../services/ushaService';
import { syncNextGenLeads } from '../services/nextgenService';
import * as leadsController from '../controllers/leads.controller';
import {
  validateQueryMiddleware,
  rateLimitMiddleware,
} from '../middleware/validateQuery.middleware';
import mongoose from 'mongoose';
import UserModel from '../models/User';
import multer from 'multer';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import CallModel from '../models/Call';
import { HEADER_ALIASES } from '../utils/headerAliases';
import { parseVendorCSV, getVendorDisplayName } from '../utils/csvParser';
import { fixDob } from '../utils/fixDob';

const router: Router = express.Router();

// Middleware to validate ObjectId format
const validateObjectId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // Special case for call-counts
  if (id === 'call-counts') {
    return next();
  }

  // Check if id is valid ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log(`Invalid ObjectId format: ${id}`);
    return res.status(400).json({ message: 'Invalid lead ID format' });
  }

  next();
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    if (!file.originalname.endsWith('.csv')) {
      cb(null, '');
      return;
    }
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 1, // Only allow 1 file per upload
  },
});

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Validation middleware
const leadValidation = [
  check('name', 'Name is required').notEmpty().optional({ nullable: true }),
  check('phone', 'Phone number is required').optional({ nullable: true }),
  check('email', 'Please include a valid email').isEmail().optional({ nullable: true }),
  check('status', 'Status is required')
    .isIn(['New', 'Contacted', 'Follow-up', 'Won', 'Lost'])
    .optional({ nullable: true }),
  check('source', 'Invalid source provided')
    .isIn(['NextGen', 'Marketplace', 'Self Generated', 'CSV Import', 'Manual Entry', 'Usha'])
    .optional({ nullable: true }),
];

// Test endpoint to check database state - MUST be the first route
router.get('/test-db', auth, leadsController.testDb);

// Main GET route for fetching leads with query parameters
router.get('/', auth, validateQueryMiddleware, rateLimitMiddleware, (req: Request, res: Response, next: NextFunction) =>
  leadsController.getLeads(req as any, res)
);

interface CsvRow {
  created_at: string;
  purchase_id: string;
  product: string;
  lead_id: string;
  vendor_id: string;
  vendor_name: string;
  vertical_id: string;
  account_id: string;
  account_name: string;
  campaign_id: string;
  campaign_name: string;
  bid_type: string;
  first_name: string;
  last_name: string;
  phone: string;
  street_1: string;
  street_2: string;
  email: string;
  city: string;
  state: string;
  zipcode: string;
  dob: string;
  gender: string;
  height: string;
  household_size: string;
  household_income: string;
  weight: string;
  military: string;
  pregnant: string;
  tobacco_user: string;
  has_prescription: string;
  has_medicare_parts_a_b: string;
  has_medical_condition: string;
  medical_conditions: string;
  insurance_timeframe: string;
  price: string;
  status: string;
  disposition: string;
  call_log_id: string;
  call_duration: string;
  source_hash: string;
  sub_id_hash: string;
  // Additional fields we're using in our code
  name?: string;
  source?: string;
  notes?: string;
  phone_number?: string;
  nextgenId?: string;
  // Add camelCase variations of name fields for Marketplace leads
  firstName?: string;
  lastName?: string;
  // Additional variations of field names that might be in CSV
  phoneNumber?: string;
  zip?: string;
  zip_code?: string;
  postalCode?: string;
  date_of_birth?: string;
  dateOfBirth?: string;
  birthdate?: string;
}

// Fix the global variable declaration to work with TypeScript
declare global {
  var currentUploadFilename: string | null;
}

// Initialize the global variable
global.currentUploadFilename = null;

// Update the classifyRow function to better identify Marketplace vs NextGen leads
const classifyRow = (row: Record<string, any>): 'NextGen' | 'Marketplace' => {
  // Check for NextGen indicators first - using specific fields from screenshot
  if (
    row.customer_id || // Key indicator for NextGen CSV format
    (row.first_name?.toString() && row.last_name?.toString()) ||
    row.vendor_id?.toString().toLowerCase().includes('nextgen') ||
    row.vendor_name?.toString().toLowerCase().includes('nextgen') ||
    row.source?.toString().toLowerCase().includes('nextgen') ||
    row.campaignName?.toString().toLowerCase().includes('nextgen') ||
    // If filename is available in the request context, check for 'purchases-' pattern
    (global.currentUploadFilename &&
      (global.currentUploadFilename.toLowerCase().includes('purchases-') ||
        global.currentUploadFilename.toLowerCase().includes('nextgen')))
  ) {
    return 'NextGen';
  }

  // Check for explicit Marketplace indicators
  if (
    row.vendor_name?.toString().toLowerCase().includes('marketplace') ||
    row.source?.toString().toLowerCase().includes('marketplace') ||
    row.campaignName?.toString().toLowerCase().includes('marketplace') ||
    // If filename is available in the request context, check for 'lead-report-' pattern
    (global.currentUploadFilename &&
      global.currentUploadFilename.toLowerCase().includes('lead-report-'))
  ) {
    return 'Marketplace';
  }

  // Default to Marketplace if no specific indicators are found
  return 'Marketplace';
};

const normaliseRow = (raw: Record<string, any>) => {
  const out: any = {};

  // Add special handling for NextGen customer_id format seen in screenshot
  const isLikelyNextGen =
    raw.customer_id !== undefined || (raw.first_name !== undefined && raw.last_name !== undefined);

  // Debug log the raw row keys
  console.log('Raw CSV row keys:', Object.keys(raw));

  Object.entries(raw).forEach(([k, v]) => {
    // Normalize field name using aliases or keep original
    // Try exact match first, then lowercase match
    const canon = HEADER_ALIASES[k.trim()] || HEADER_ALIASES[k.trim().toLowerCase()] || k;

    // Store the value with the canonical key
    out[canon] = v;

    // Also store with original key for debugging
    out[k] = v;

    // Special handling for name fields in NextGen format
    if (isLikelyNextGen) {
      if (k.trim().toLowerCase() === 'first_name') {
        out.firstName = v;
      }
      if (k.trim().toLowerCase() === 'last_name') {
        out.lastName = v;
      }
    }
  });

  // Set source based on the row content
  out.source = classifyRow(raw);

  // Debug log the normalized output
  console.log('Normalized row - phone field:', out.phone || out.Phone || 'NOT FOUND');

  // Standardise DOB using single-pass normaliser
  if (out.dob && typeof out.dob === 'string') {
    const fixed = fixDob(out.dob as string);
    if (fixed) {
      out.dob = fixed;
      console.log(`[DOB MAPPING] Normalised DOB → ${fixed}`);
    }
  }

  return out;
};

// CSV Upload endpoint
router.post('/upload', auth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('Starting CSV upload...');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log('File path:', filePath);

    // Store the original filename globally for the classifyRow function to use
    global.currentUploadFilename = req.file.originalname || null;
    console.log('Processing file:', global.currentUploadFilename);

    // Verify file exists and is readable
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      console.log('File exists and is readable');
    } catch (error) {
      console.error('File access error:', error);
      return res.status(400).json({ message: 'File is not accessible' });
    }

    // Read and parse CSV
    console.log('Starting CSV parsing...');
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    console.log('File content preview:', fileContent.substring(0, 200));
    console.log('CSV Headers:', fileContent.split('\n')[0]);

    // Parse CSV in chunks to avoid timeout
    const results = await new Promise<CsvRow[]>((resolve, reject) => {
      parse(
        fileContent,
        {
          columns: true,
          skip_empty_lines: true,
          quote: '"',
          escape: '"',
          relax_quotes: true,
          relax_column_count: true,
          trim: true,
        },
        (err: any, records: any) => {
          if (err) {
            console.error('CSV parsing error:', err);
            reject(err);
            return;
          }
          resolve(records as CsvRow[]);
        }
      );
    });

    console.log(`Parsed ${results.length} rows from CSV`);

    // Get the current maximum order
    const maxOrderLead = await LeadModel.findOne().sort({ order: -1 });
    let currentOrder = maxOrderLead?.order ?? 0;

    // Process each row
    const stats = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    // Log the first row to see what we're working with
    if (results.length > 0) {
      console.log('Sample first row (raw):', results[0]);
    }

    // Process in batches to avoid timeout
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(results.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, results.length);
      const batch = results.slice(start, end);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (rows ${start + 1}-${end})`);

      for (const rawRow of batch) {
        try {
          // Use normaliseRow to standardize fields and determine source
          const row = normaliseRow(rawRow);

          // Now we use the normalized source value
          const isMarketplaceLead = row.source === 'Marketplace';
          const isNextGenLead = row.source === 'NextGen';

          // Get first name and last name based on lead source
          let firstName = '';
          let lastName = '';

          // For NextGen leads, get name parts from various field options
          if (isNextGenLead) {
            // Try all possible field combinations for first name (prioritizing normalized fields)
            firstName = row.firstName?.trim() || row.first_name?.trim() || '';
            lastName = row.lastName?.trim() || row.last_name?.trim() || '';

            console.log(
              `NextGen lead name parts: firstName="${firstName}", lastName="${lastName}"`
            );
          }
          // For Marketplace leads, use camelCase fields
          else if (isMarketplaceLead) {
            firstName = row.firstName?.trim() || '';
            lastName = row.lastName?.trim() || '';
          }
          // Fallback for any other type
          else {
            firstName = row.firstName?.trim() || row.first_name?.trim() || '';
            lastName = row.lastName?.trim() || row.last_name?.trim() || '';
          }

          // Extract a potential name from email if available - use this as a last resort
          const extractNameFromEmail = (email: string): string => {
            if (!email || !email.includes('@')) {
              return '';
            }
            let emailName = email.split('@')[0];
            // Clean up the email name - remove numbers, dots, underscores and convert to proper case
            emailName = emailName.replace(/[0-9_\.]/g, ' ').trim();
            // Convert to proper case (capitalize first letter of each word)
            return emailName
              .split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          };

          // Properly format the name, NEVER use generic placeholders when real data exists
          let fullName = '';

          if (row.name && row.name.trim() !== '') {
            // Use existing name if available in the row
            fullName = row.name.trim();
          } else if (firstName && lastName) {
            // Construct from first and last name
            fullName = `${firstName} ${lastName}`.trim();
          } else if (firstName) {
            // Use just first name if that's all we have
            fullName = firstName.trim();
          } else if (lastName) {
            // Use just last name if that's all we have
            fullName = lastName.trim();
          } else if (row.email && row.email.includes('@')) {
            // Try to extract a name from email as a fallback
            fullName = extractNameFromEmail(row.email);
          } else if (row.phone) {
            // If we have a phone but no other identifying info
            fullName = isNextGenLead ? 'NextGen Contact' : 'Marketplace Contact';
          } else {
            // ONLY as absolute last resort with NO identifying info
            fullName = isNextGenLead ? 'NextGen Lead' : 'Marketplace Lead';
          }

          // Ensure we never have an empty name
          if (!fullName || fullName.trim() === '') {
            fullName = 'Contact ' + (row.phone || row.email || Date.now().toString());
          }

          console.log(`Determined name for lead: "${fullName}"`);

          // Handle phone number - normalize across all lead types
          let phone = '';

          // Try multiple possible phone field names
          if (row.phone) {
            phone = row.phone;
          } else if (row.Phone) {
            phone = row.Phone;
          } else if (row.PHONE) {
            phone = row.PHONE;
          } else if (row.phone_number) {
            phone = row.phone_number;
          } else if (row.phoneNumber) {
            phone = row.phoneNumber;
          } else if (row['Phone Number']) {
            phone = row['Phone Number'];
          } else if (row.mobile) {
            phone = row.mobile;
          } else if (row.Mobile) {
            phone = row.Mobile;
          } else if (row.cell) {
            phone = row.cell;
          } else if (row.Cell) {
            phone = row.Cell;
          }

          // Debug log for phone mapping
          console.log(
            `Phone field mapping - Raw: ${JSON.stringify({
              phone: row.phone,
              Phone: row.Phone,
              PHONE: row.PHONE,
              phone_number: row.phone_number,
              phoneNumber: row.phoneNumber,
            })}, Final: ${phone}`
          );

          // Clean phone number - remove non-digits
          if (phone) {
            phone = phone.toString().replace(/\D/g, '');
            // Format as (XXX) XXX-XXXX if 10 digits
            if (phone.length === 10) {
              phone = `(${phone.substring(0, 3)}) ${phone.substring(3, 6)}-${phone.substring(6)}`;
            } else if (phone.length === 11 && phone.startsWith('1')) {
              // Format as (XXX) XXX-XXXX if 11 digits starting with 1
              phone = `(${phone.substring(1, 4)}) ${phone.substring(4, 7)}-${phone.substring(7)}`;
            }
          }

          // Check for existing lead by phone or email to avoid duplicates
          const email = row.email || row.Email || row.EMAIL || '';

          const existingLead = await LeadModel.findOne({
            $or: [{ phone: { $ne: '', $eq: phone } }, { email: { $ne: '', $eq: email } }],
          });

          if (existingLead) {
            console.log(
              `Found existing lead: ${existingLead.name} (${existingLead.phone || existingLead.email})`
            );

            // Update the existing lead with new information but preserve important existing data
            const updatedData = {
              // Only update name if it wasn't properly set before
              name:
                existingLead.name === 'Unknown' || !existingLead.name
                  ? fullName
                  : existingLead.name,
              firstName: firstName || existingLead.firstName,
              lastName: lastName || existingLead.lastName,
              // Keep existing phone and email if they exist, otherwise use new ones
              phone: existingLead.phone || phone,
              email: existingLead.email || email,
              // Other fields...
              state:
                row.state?.trim().toUpperCase() ||
                row.State?.trim().toUpperCase() ||
                row.STATE?.trim().toUpperCase() ||
                existingLead.state,
              city: row.city || row.City || row.CITY || existingLead.city,
              zipcode:
                row.zipcode ||
                row.Zipcode ||
                row.zip ||
                row.Zip ||
                row.ZIP ||
                row.zip_code ||
                existingLead.zipcode,
              dob:
                row.dob ||
                row.DOB ||
                row.dateOfBirth ||
                row.date_of_birth ||
                row['Date of Birth'] ||
                existingLead.dob,
              height: row.height || row.Height || row.HEIGHT || existingLead.height,
              weight: row.weight || row.Weight || row.WEIGHT || existingLead.weight,
              gender: row.gender || row.Gender || row.GENDER || existingLead.gender,
              // Keep source attribution but update if needed
              source: existingLead.source || row.source,
              vendorName: existingLead.vendorName || row.vendor_name || row.vendorName,
              nextgenId: existingLead.nextgenId || row.nextgenId || row.customer_id,
              // Preserve important fields
              status: existingLead.status,
              disposition: existingLead.disposition,
              // Keep original notes and add new info if available
              notes: existingLead.notes || row.notes || row.Notes || row.NOTES,
              // Don't change the order
              order: existingLead.order,
            };

            await LeadModel.updateOne({ _id: existingLead._id }, { $set: updatedData });
            stats.updated++;
            console.log(`Updated existing lead: ${fullName}`);
          } else {
            // Create new lead with incremented order
            currentOrder++;

            // Create notes based on source type
            let notes = '';
            if (isNextGenLead) {
              notes = `🌟 New NextGen Lead\n\nImported on: ${new Date().toLocaleDateString()}\n`;
              if (row.customer_id) {
                notes += `Customer ID: ${row.customer_id}\n`;
              }
            } else {
              notes = `🌟 New Marketplace Lead\n\nImported on: ${new Date().toLocaleDateString()}\n`;
              if (row.campaign_name) {
                notes += `Campaign: ${row.campaign_name}\n`;
              }
            }

            // Add location info
            notes += `Location: ${row.city || ''}, ${row.state?.toUpperCase() || ''} ${row.zipcode || row.zip || ''}\n`;

            // Add demographic info if available
            if (row.dob || row.height || row.weight || row.gender) {
              notes += '\nDemographics:\n';
              if (row.dob) {
                notes += `DOB: ${row.dob}\n`;
              }
              if (row.height) {
                notes += `Height: ${row.height}\n`;
              }
              if (row.weight) {
                notes += `Weight: ${row.weight}\n`;
              }
              if (row.gender) {
                notes += `Gender: ${row.gender}\n`;
              }
            }

            // Add vendor info if available
            if (row.vendor_name) {
              notes += `\nVendor: ${row.vendor_name}\n`;
            }

            const lead = new LeadModel({
              name: fullName,
              firstName,
              lastName,
              phone,
              email: email || `${Date.now()}@noemail.com`,
              state:
                row.state?.trim().toUpperCase() ||
                row.State?.trim().toUpperCase() ||
                row.STATE?.trim().toUpperCase() ||
                '',
              city: row.city || row.City || row.CITY || '',
              zipcode:
                row.zipcode || row.Zipcode || row.zip || row.Zip || row.ZIP || row.zip_code || '',
              dob:
                row.dob ||
                row.DOB ||
                row.dateOfBirth ||
                row.date_of_birth ||
                row['Date of Birth'] ||
                '',
              height: row.height || row.Height || row.HEIGHT || '',
              weight: row.weight || row.Weight || row.WEIGHT || '',
              gender: row.gender || row.Gender || row.GENDER || '',
              source: row.source,
              vendorName: row.vendor_name || row.vendorName || '',
              nextgenId: row.nextgenId || row.customer_id || '',
              notes: notes || row.notes || row.Notes || row.NOTES || '',
              order: currentOrder,
              createdAt: new Date(),
            });

            await lead.save();
            console.log(`Created new lead: ${fullName} (${lead._id})`);
            stats.imported++;
          }
        } catch (error) {
          console.error('Error processing row:', error);
          stats.errors++;
        }
      }

      // Small delay between batches to prevent overwhelming the database
      if (batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Clean up temporary file
    await fs.promises.unlink(filePath);
    console.log('Cleaned up temporary file');

    console.log('Upload complete:', stats);
    return res.json({
      message: 'CSV processed successfully',
      stats,
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ message: 'Error processing CSV file' });
  } finally {
    // Reset the filename after processing
    global.currentUploadFilename = null;
  }
});

// New improved CSV import using vendor-aware parser
router.post('/import-csv', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing CSV file:', req.file.originalname);

    // Check for manual source override in request body
    const manualSource = req.body?.source;
    const validSources = [
      'NextGen',
      'Marketplace',
      'Self Generated',
      'CSV Import',
      'Manual Entry',
      'Usha',
    ];

    if (manualSource && !validSources.includes(manualSource)) {
      return res.status(400).json({
        error: 'Invalid source specified',
        validSources,
        providedSource: manualSource,
      });
    }

    const fileContent = fs.readFileSync(req.file.path);

    // Use the new vendor-aware parser
    const parseResult = await parseVendorCSV(fileContent, {
      skipEmptyLines: true,
      maxRows: 10000, // Safety limit
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Log vendor detection results
    console.log(`Vendor detection result: ${parseResult.vendor}`);
    if (parseResult.vendor === 'UNKNOWN') {
      console.log('Unable to automatically detect vendor from CSV headers');
      console.log(`Headers found: ${parseResult.stats.unknownColumns.slice(0, 10).join(', ')}`);

      if (!manualSource) {
        return res.status(400).json({
          error: 'Unable to detect CSV vendor type and no manual source specified',
          details: parseResult.errors,
          vendor: parseResult.vendor,
          headers: parseResult.stats.unknownColumns.slice(0, 20),
          suggestion:
            "Please specify 'source' in the request body with one of: " + validSources.join(', '),
        });
      }
    }

    // Check for other parsing errors
    if (parseResult.errors.length > 0 && parseResult.vendor !== 'UNKNOWN') {
      console.error('CSV parsing errors:', parseResult.errors);
      return res.status(400).json({
        error: 'Failed to parse CSV',
        details: parseResult.errors,
        vendor: parseResult.vendor,
      });
    }

    // Determine the source to use
    let sourceToUse = manualSource;
    if (!sourceToUse && parseResult.vendor !== 'UNKNOWN') {
      sourceToUse = getVendorDisplayName(parseResult.vendor);
    }
    if (!sourceToUse) {
      sourceToUse = 'CSV Import'; // Default fallback
    }

    console.log(
      `Using source: ${sourceToUse} (Manual: ${!!manualSource}, Detected: ${getVendorDisplayName(parseResult.vendor)})`
    );
    console.log(`Parsed ${parseResult.leads.length} leads successfully`);

    // Import stats
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each lead
    for (const leadData of parseResult.leads) {
      try {
        // Override source if manual source provided
        if (manualSource) {
          leadData.source = manualSource;
        } else if (parseResult.vendor === 'UNKNOWN') {
          leadData.source = 'CSV Import';
        }

        // Check if lead exists by phone or email
        const existingLead = await LeadModel.findOne({
          $or: [{ phone: leadData.phone }, { email: leadData.email }].filter(
            (condition) => condition.phone || condition.email
          ),
        });

        if (existingLead) {
          // Update existing lead only if source matches or no source set
          if (!existingLead.source || existingLead.source === leadData.source) {
            await LeadModel.findByIdAndUpdate(existingLead._id, {
              // Update fields that might be missing
              firstName: leadData.firstName || existingLead.firstName,
              lastName: leadData.lastName || existingLead.lastName,
              name: leadData.name || existingLead.name,
              state: leadData.state || existingLead.state,
              city: leadData.city || existingLead.city,
              zipcode: leadData.zipcode || existingLead.zipcode,
              dob: leadData.dob || existingLead.dob,
              height: leadData.height || existingLead.height,
              weight: leadData.weight || existingLead.weight,
              gender: leadData.gender || existingLead.gender,
              source: leadData.source, // Always update source to ensure it's set
              // Preserve existing important fields
              status: existingLead.status,
              disposition: existingLead.disposition,
              notes: existingLead.notes,
            });
            updated++;
            console.log(`Updated existing lead: ${leadData.name}`);
          } else {
            skipped++;
            console.log(
              `Skipped lead with mismatched source: ${leadData.name} (existing: ${existingLead.source}, new: ${leadData.source})`
            );
          }
        } else {
          // Create new lead with proper notes
          const importDate = new Date().toLocaleDateString();
          let notes = `🌟 New ${leadData.source} Lead\n\nImported on: ${importDate}\n`;

          // Add filename info
          notes += `File: ${req.file.originalname}\n`;

          // Add location if available
          if (leadData.city || leadData.state || leadData.zipcode) {
            notes += `Location: ${[leadData.city, leadData.state, leadData.zipcode].filter(Boolean).join(', ')}\n`;
          }

          // Add demographics if available
          const demographics = [];
          if (leadData.dob) {
            demographics.push(`DOB: ${leadData.dob}`);
          }
          if (leadData.gender) {
            demographics.push(`Gender: ${leadData.gender}`);
          }
          if (demographics.length > 0) {
            notes += `\nDemographics:\n${demographics.join('\n')}\n`;
          }

          // Create the lead
          await LeadModel.create({
            ...leadData,
            name:
              leadData.name ||
              `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim() ||
              'Unknown',
            email: leadData.email || `${Date.now()}@placeholder.com`,
            status: 'New',
            notes: notes,
            assignedTo: req.user?.id,
          });

          imported++;
          console.log(`Imported new lead: ${leadData.name} (source: ${leadData.source})`);
        }
      } catch (error) {
        errors++;
        console.error('Error processing lead:', error, leadData);
      }
    }

    // Return detailed results
    res.json({
      success: true,
      vendor:
        parseResult.vendor === 'UNKNOWN' ? 'Unknown' : getVendorDisplayName(parseResult.vendor),
      sourceUsed: sourceToUse,
      manualSourceProvided: !!manualSource,
      message: `Processed ${parseResult.stats.totalRows} rows from ${sourceToUse} CSV`,
      stats: {
        imported,
        updated,
        skipped,
        errors,
        totalRows: parseResult.stats.totalRows,
        successfulRows: parseResult.stats.successfulRows,
        failedRows: parseResult.stats.failedRows,
      },
      warnings: parseResult.warnings,
      unknownColumns: parseResult.stats.unknownColumns,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({
      error: 'Failed to import CSV',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Simplified version for quick imports (uses same parser)
router.post('/import-csv-now', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path);

    // Use the same vendor-aware parser
    const parseResult = await parseVendorCSV(fileContent);

    // Clean up
    fs.unlinkSync(req.file.path);

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        error: parseResult.errors[0],
        vendor: parseResult.vendor,
      });
    }

    // Quick import - just insert without checking duplicates
    let count = 0;

    for (const leadData of parseResult.leads) {
      try {
        await LeadModel.create({
          ...leadData,
          name: leadData.name || 'Unknown',
          email: leadData.email || `${Date.now()}@placeholder.com`,
          status: 'New',
          assignedTo: req.user?.id,
        });
        count++;
      } catch (error) {
        console.error('Quick import error:', error);
      }
    }

    res.json({
      success: true,
      vendor: getVendorDisplayName(parseResult.vendor),
      imported: count,
      total: parseResult.leads.length,
    });
  } catch (error) {
    console.error('CSV quick import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// New endpoint to fetch call counts for leads
router.get('/call-counts', auth, leadsController.getCallCounts);

// Fetch Usha leads - requires admin
router.get('/sync-usha', auth, isAdmin, async (req: Request, res: Response) => {
  try {
    const result = await fetchUshaLeads();
    res.json(result);
  } catch (error) {
    console.error('Error syncing Usha leads:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
});

// Sync NextGen leads - requires admin
router.get('/sync-nextgen', auth, isAdmin, async (req: Request, res: Response) => {
  try {
    const result = await syncNextGenLeads();
    res.json(result);
  } catch (error) {
    console.error('Error syncing NextGen leads:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
});

// CSV export route – placed before parameterised routes to avoid shadowing
router.get('/export', auth, validateQueryMiddleware, rateLimitMiddleware, (req: Request, res: Response) =>
  leadsController.exportLeadsCsv(req as any, res)
);

// Get lead by ID - MUST be the last route
router.get('/:id', auth, validateObjectId, leadsController.getLeadById);

// Create new lead
router.post('/', [auth, isAdmin, ...leadValidation], leadsController.createLead);

// Update lead
router.put('/:id', [auth], leadsController.updateLead);

// Delete lead - updated to handle both admin and non-admin users
router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    console.log('Attempting to delete lead:', req.params.id);

    const lead = await LeadModel.findById(req.params.id);

    if (!lead) {
      console.log('Lead not found:', req.params.id);
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check if user has access to delete this lead
    if (req.user?.role !== 'admin' && lead.assignedTo?.toString() !== req.user?.id) {
      console.log('Access denied for user:', req.user?.id);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete the lead
    await lead.deleteOne();
    console.log('Lead deleted successfully:', req.params.id);

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      message: 'Error deleting lead',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete placeholder leads
router.delete('/delete-placeholders', auth, async (req: Request, res: Response) => {
  try {
    // Delete leads where name is "Unknown Name" or empty
    const result = await LeadModel.deleteMany({
      $or: [{ name: 'Unknown Name' }, { name: '' }],
    });

    console.log('Deleted placeholder leads:', result.deletedCount);
    res.json({ message: `Deleted ${result.deletedCount} placeholder leads` });
  } catch (error) {
    console.error('Error deleting placeholder leads:', error);
    res.status(500).json({ message: 'Error deleting placeholder leads' });
  }
});

// New route for reordering
router.post('/:id/reorder', auth, leadsController.reorderLead);

// New route for reversing the order
router.post('/reverse-order', auth, leadsController.reverseOrder);

// Update leads with missing fields from CSV
router.post('/update-leads-data', auth, isAdmin, async (req: Request, res: Response) => {
  try {
    const csvPath = path.join(__dirname, '../../../csv/purchases-2025-02-03-to-2025-03-23.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records: any[] = [];

    await new Promise((resolve, reject) => {
      parse(
        fileContent,
        {
          columns: true,
          skip_empty_lines: true,
        },
        (err: any, data: any) => {
          if (err) {
            reject(err);
          } else {
            records.push(...data);
            resolve(null);
          }
        }
      );
    });

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const record of records) {
      try {
        // Find lead by phone number
        const lead = await LeadModel.findOne({ phone: record.phone });

        if (lead) {
          // Update lead with missing fields
          await LeadModel.findByIdAndUpdate(lead._id, {
            zipcode: record.zipcode || '',
            dob: record.dob || '',
            height: record.height || '',
            weight: record.weight || '',
            gender: record.gender || '',
            state: record.state?.toUpperCase() || '',
            firstName: record.first_name || '',
            lastName: record.last_name || '',
            disposition: record.disposition || lead.disposition || 'New Lead',
          });
          updatedCount++;
        } else {
          notFoundCount++;
        }
      } catch (error) {
        console.error('Error updating lead:', error);
      }
    }

    res.json({
      success: true,
      message: `Successfully updated ${updatedCount} leads`,
      stats: {
        updated: updatedCount,
        notFound: notFoundCount,
      },
    });
  } catch (error) {
    console.error('Error updating leads:', error);
    res.status(500).json({ error: 'Failed to update leads' });
  }
});

// Route to reconcile dispositions
router.get('/reconcile-dispositions', auth, isAdmin, async (req: Request, res: Response) => {
  try {
    // Find leads with non-empty dispositions
    const leadsWithDispositions = await LeadModel.find({
      disposition: { $exists: true, $ne: '' },
    });

    console.log(`Found ${leadsWithDispositions.length} leads with dispositions to verify`);

    let updates = 0;
    let skipped = 0;

    // For each lead, check if the disposition is correctly reflected
    for (const lead of leadsWithDispositions) {
      // Just verify the lead has the disposition still properly set
      // If for some reason the lead's disposition was wiped out from a CSV upload,
      // this would have been caught, but we already know the lead has a non-empty disposition

      // Log the verified lead disposition
      console.log(`Verified disposition for lead ${lead._id}: ${lead.disposition}`);
      skipped++;
    }

    // Now let's check leads that should have a disposition but don't
    // This is the case where a lead appears in a disposition filter but doesn't show the disposition
    const leadsWithoutDispositions = await LeadModel.find({
      $or: [{ disposition: { $exists: false } }, { disposition: '' }],
    });

    console.log(`Found ${leadsWithoutDispositions.length} leads without dispositions to check`);

    for (const lead of leadsWithoutDispositions) {
      // Here we would examine the lead notes or other indicators to determine if they should have a disposition
      // For this implementation, we'll check if the notes mention a disposition

      const notes = lead.notes || '';
      let inferredDisposition = '';

      // Check for disposition mentions in notes
      if (notes.includes('Disposition: ')) {
        const dispositionMatch = notes.match(/Disposition:\s*([^\n]+)/);
        if (dispositionMatch && dispositionMatch[1]) {
          inferredDisposition = dispositionMatch[1].trim();
        }
      }

      // Update the lead if we found a disposition in the notes
      if (inferredDisposition) {
        console.log(
          `Setting disposition "${inferredDisposition}" for lead ${lead._id} based on notes`
        );

        await LeadModel.updateOne(
          { _id: lead._id },
          { $set: { disposition: inferredDisposition } }
        );

        updates++;
      }
    }

    // Return the results
    res.json({
      success: true,
      message: `Reconciliation complete. ${updates} leads updated, ${skipped} already had correct dispositions.`,
    });
  } catch (error) {
    console.error('Error reconciling dispositions:', error);
    res.status(500).json({ message: 'Error reconciling dispositions' });
  }
});

// Add a more comprehensive reconciliation endpoint for CSV issues
router.get('/fix-csv-duplicates', auth, isAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Starting CSV duplicates fix process...');

    // 1. Identify all leads, grouping by phone or email
    const allLeads = await LeadModel.find({}).lean();

    // Group by phone
    const phoneGroups = new Map();
    const emailGroups = new Map();

    for (const lead of allLeads) {
      if (lead.phone) {
        const phone = lead.phone.replace(/\D/g, ''); // Normalize phone number
        if (!phoneGroups.has(phone)) {
          phoneGroups.set(phone, []);
        }
        phoneGroups.get(phone).push(lead);
      }

      if (lead.email) {
        const email = lead.email.toLowerCase().trim();
        if (!emailGroups.has(email)) {
          emailGroups.set(email, []);
        }
        emailGroups.get(email).push(lead);
      }
    }

    // Identify duplicates
    const duplicatePhones = Array.from(phoneGroups.entries()).filter(
      ([phone, leads]) => leads.length > 1
    );

    const duplicateEmails = Array.from(emailGroups.entries()).filter(
      ([email, leads]) => leads.length > 1
    );

    console.log(`Found ${duplicatePhones.length} phone number duplicates`);
    console.log(`Found ${duplicateEmails.length} email duplicates`);

    // Stats for the result
    const stats = {
      phoneDuplicates: duplicatePhones.length,
      emailDuplicates: duplicateEmails.length,
      leadsMerged: 0,
      dispositionsRecovered: 0,
      notesRecovered: 0,
    };

    // Process phone duplicates
    for (const [phone, leads] of duplicatePhones) {
      // Sort leads by creation date, oldest first
      leads.sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const oldestLead = leads[0];
      const newerLeads = leads.slice(1);

      for (const newerLead of newerLeads) {
        // Get disposition from newer lead if it exists and oldest lead doesn't have one
        if (newerLead.disposition && (!oldestLead.disposition || oldestLead.disposition === '')) {
          await LeadModel.updateOne(
            { _id: oldestLead._id },
            { $set: { disposition: newerLead.disposition } }
          );
          stats.dispositionsRecovered++;
          console.log(
            `Recovered disposition "${newerLead.disposition}" from duplicate to lead ${oldestLead._id}`
          );
        }

        // Merge notes if needed
        if (newerLead.notes && newerLead.notes !== oldestLead.notes) {
          const combinedNotes = oldestLead.notes
            ? `${oldestLead.notes}\n\n--- MERGED NOTES FROM DUPLICATE ---\n${newerLead.notes}`
            : newerLead.notes;

          await LeadModel.updateOne({ _id: oldestLead._id }, { $set: { notes: combinedNotes } });
          stats.notesRecovered++;
          console.log(`Merged notes from duplicate lead to lead ${oldestLead._id}`);
        }

        // Finally, delete the duplicate lead
        // Commented out for safety - enable this after testing
        // await LeadModel.deleteOne({ _id: newerLead._id });
      }

      stats.leadsMerged += newerLeads.length;
    }

    // Process email duplicates similarly
    // Skip this for now to avoid double-processing phone-email pairs

    res.json({
      success: true,
      message: 'CSV duplicate fix completed',
      stats,
      action:
        'Dispositions and notes have been recovered from duplicates. Duplicates were NOT deleted. Review and run again with deletion enabled when ready.',
    });
  } catch (error) {
    console.error('Error fixing CSV duplicates:', error);
    res.status(500).json({ message: 'Error fixing CSV duplicates' });
  }
});

// Endpoint to record a new call
router.post('/record-call', auth, async (req: Request, res: Response) => {
  try {
    const { leadId, phone, direction } = req.body;

    if (!leadId || !phone) {
      return res.status(400).json({ error: 'Lead ID and phone are required' });
    }

    // Find the lead to make sure it exists
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create a new call record
    const call = new CallModel({
      twilioSid: `manual-${Date.now()}`, // Generate a placeholder SID for manual calls
      from: req.user?.email || 'unknown',
      to: phone,
      status: 'completed',
      direction: direction || 'outbound',
      agent: req.user?._id,
      lead: leadId,
      duration: 0, // Start with 0, can be updated later
    });

    await call.save();

    res.json({
      success: true,
      call,
    });
  } catch (error) {
    console.error('Error recording call:', error);
    res.status(500).json({ error: 'Error recording call' });
  }
});

// Add a new endpoint to fix existing leads
router.post('/fix-all-leads', auth, async (req: Request, res: Response) => {
  try {
    console.log('Starting to fix all leads in the database...');

    // Get all leads
    const leads = await LeadModel.find({});
    console.log(`Found ${leads.length} leads to process`);

    let updatedCount = 0;
    let errors = 0;

    // Process each lead
    for (const lead of leads) {
      try {
        let shouldUpdate = false;
        const updates: any = {};

        // Fix the source field - enforce strict 'NextGen' or 'Marketplace' values
        // This ensures consistent casing and format that the frontend expects

        // Check for marketplace indicators - using lowercase for the check but capitalize for the value
        const isMarketplaceLead =
          (lead.source && lead.source.toLowerCase().includes('marketplace')) ||
          (lead.vendorName && lead.vendorName.toLowerCase().includes('marketplace')) ||
          (lead.notes && lead.notes.toLowerCase().includes('marketplace')) ||
          (lead.email && lead.email.toLowerCase().includes('marketplace'));

        // Check for nextgen indicators - using lowercase for the check but capitalize for the value
        const isNextGenLead =
          (lead.source && lead.source.toLowerCase().includes('nextgen')) ||
          (lead.vendorName && lead.vendorName.toLowerCase().includes('nextgen')) ||
          (lead.notes && lead.notes.toLowerCase().includes('nextgen')) ||
          lead.nextgenId;

        // Always set the source field with proper capitalization to ensure all leads have consistent format
        if (isNextGenLead) {
          updates.source = 'NextGen'; // Use the exact casing expected by the frontend
          shouldUpdate = true;
        } else if (isMarketplaceLead) {
          updates.source = 'Marketplace'; // Use the exact casing expected by the frontend
          shouldUpdate = true;
        } else if (!lead.source || lead.source === '') {
          // Default to marketplace if neither
          updates.source = 'Marketplace';
          shouldUpdate = true;
        } else if (lead.source.toLowerCase() === 'nextgen') {
          // Fix case sensitivity issues
          updates.source = 'NextGen';
          shouldUpdate = true;
        } else if (lead.source.toLowerCase() === 'marketplace') {
          // Fix case sensitivity issues
          updates.source = 'Marketplace';
          shouldUpdate = true;
        }

        // Fix name for all leads - check for actual contact data BEFORE using placeholder names
        if (
          (!lead.name ||
            lead.name === 'Unknown' ||
            lead.name === 'NextGen Lead' ||
            lead.name === 'Marketplace Lead') &&
          (lead.firstName || lead.lastName)
        ) {
          // If we have firstName or lastName, use those
          updates.name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
          shouldUpdate = true;
        } else if (
          (!lead.name ||
            lead.name === 'Unknown' ||
            lead.name === 'NextGen Lead' ||
            lead.name === 'Marketplace Lead') &&
          lead.email &&
          lead.email.includes('@')
        ) {
          // Try to extract a name from email as a fallback
          let emailName = lead.email.split('@')[0];
          // Clean up the email name
          emailName = emailName.replace(/[0-9_\.]/g, ' ').trim();
          // Convert to proper case
          updates.name = emailName
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          shouldUpdate = true;
        } else if (
          (!lead.name || lead.name === 'Unknown') &&
          !lead.firstName &&
          !lead.lastName &&
          !lead.email
        ) {
          // ONLY use placeholders when we have no name info whatsoever
          if (updates.source === 'Marketplace' || lead.source === 'Marketplace') {
            updates.name = 'Marketplace Contact';
            shouldUpdate = true;
          } else if (updates.source === 'NextGen' || lead.source === 'NextGen') {
            updates.name = 'NextGen Contact';
            shouldUpdate = true;
          }
        }

        // Fix phone number formatting
        if (lead.phone) {
          // Remove non-digits
          const cleanPhone = lead.phone.replace(/\D/g, '');

          // Format as (XXX) XXX-XXXX if 10 digits
          if (cleanPhone.length === 10) {
            const formattedPhone = `(${cleanPhone.substring(0, 3)}) ${cleanPhone.substring(3, 6)}-${cleanPhone.substring(6)}`;
            if (formattedPhone !== lead.phone) {
              updates.phone = formattedPhone;
              shouldUpdate = true;
            }
          } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
            // Format as (XXX) XXX-XXXX if 11 digits starting with 1
            const formattedPhone = `(${cleanPhone.substring(1, 4)}) ${cleanPhone.substring(4, 7)}-${cleanPhone.substring(7)}`;
            if (formattedPhone !== lead.phone) {
              updates.phone = formattedPhone;
              shouldUpdate = true;
            }
          }
        }

        // Ensure phone number is formatted consistently
        if (!lead.phone && lead.phoneNumber) {
          updates.phone = lead.phoneNumber;
          shouldUpdate = true;
        }

        // Fix zipcode formatting
        if (lead.zipcode) {
          // Keep only digits
          let cleanZip = lead.zipcode.replace(/\D/g, '');
          // Keep only first 5 digits
          cleanZip = cleanZip.substring(0, 5);

          if (cleanZip !== lead.zipcode) {
            updates.zipcode = cleanZip;
            shouldUpdate = true;
          }
        }

        // Fix DOB formatting
        if (lead.dob) {
          try {
            // Try to parse the date
            const dobDate = new Date(lead.dob);
            if (!isNaN(dobDate.getTime())) {
              // Format as MM/DD/YYYY
              const month = (dobDate.getMonth() + 1).toString().padStart(2, '0');
              const day = dobDate.getDate().toString().padStart(2, '0');
              const year = dobDate.getFullYear();
              const formattedDob = `${month}/${day}/${year}`;

              if (formattedDob !== lead.dob) {
                updates.dob = formattedDob;
                shouldUpdate = true;
              }
            }
          } catch (e) {
            console.error(`Could not parse date: ${lead.dob}`);
          }
        }

        // Fix state formatting
        if (lead.state) {
          const upperState = lead.state.trim().toUpperCase();
          // If state is longer than 2 characters, it might be a full state name, so keep only the first 2 chars
          const fixedState = upperState.length > 2 ? upperState.substring(0, 2) : upperState;

          if (fixedState !== lead.state) {
            updates.state = fixedState;
            shouldUpdate = true;
          }
        }

        // Update the lead if needed
        if (shouldUpdate) {
          await LeadModel.updateOne({ _id: lead._id }, { $set: updates });
          updatedCount++;
          console.log(`Updated lead ${lead._id}: ${JSON.stringify(updates)}`);
        }
      } catch (error) {
        console.error('Error updating lead:', error);
        errors++;
      }
    }

    return res.status(200).json({
      message: 'Leads update completed',
      total: leads.length,
      updated: updatedCount,
      errors,
    });
  } catch (error) {
    console.error('Error in fix-all-leads:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// NEW: Get filter options
router.get('/filters', auth, leadsController.getFilterOptions);

// ADD_NOTES_ROUTE_START
router.patch('/:id/notes', auth, leadsController.updateLeadNotes);
// ADD_NOTES_ROUTE_END

// After the other routes, add this endpoint
// GET /api/leads/recent
router.get('/recent', auth, async (req: Request, res: Response) => {
  try {
    const since = req.query.since ? parseInt(req.query.since as string) : Date.now() - 300000;
    const source = req.query.source as string;
    
    const sinceDate = new Date(since);
    
    const query: any = {
      createdAt: { $gte: sinceDate }
    };
    
    if (source) {
      query.source = source;
    }
    
    const recentLeads = await LeadModel.find(query)
      .select('_id name source createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    return res.json(recentLeads);
  } catch (error) {
    console.error('Error fetching recent leads:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
