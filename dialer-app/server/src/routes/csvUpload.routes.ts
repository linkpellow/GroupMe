import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { parseVendorCSV, getVendorDisplayName } from '../utils/csvParser';
import { auth } from '../middleware/auth';
import LeadModel from '../models/Lead';
import { broadcastNewLeadNotification } from '../index';

// Configure multer for CSV uploads (max 50 MB, single file)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1,
  },
});

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router: Router = express.Router();

/**
 * POST /api/csv-upload
 * Authenticated CSV import that stamps tenantId + assignedTo.
 */
router.post('/', auth, upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ error: 'User authentication failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(req.file.path);

    // Parse with vendor-aware helper
    const parseResult = await parseVendorCSV(fileBuffer, { skipEmptyLines: true, maxRows: 15000 });

    // Normalise leadId & createdAt BEFORE further processing
    for (const lead of parseResult.leads as any[]) {
      if (lead.leadId) {
        lead.leadId = String(lead.leadId).trim().toLowerCase();
      }
      if (lead.createdAt && typeof lead.createdAt === 'string') {
        const parsed = new Date(lead.createdAt);
        if (!isNaN(parsed.getTime())) {
          lead.createdAt = parsed;
        }
      }
    }

    // Deduplicate NextGen rows (ad + data) by leadId and sum price
    if (parseResult.vendor === 'NEXTGEN') {
      const dedupMap = new Map<string, any>();
      let premiumListingCount = 0;
      
      for (const lead of parseResult.leads) {
        const key = (lead as any).leadId || lead.phone || lead.email || Math.random().toString();
        
        if (dedupMap.has(key)) {
          const existing = dedupMap.get(key);
          const isPremiumListing = (lead as any).product === 'ad';
          const isExistingPremium = existing.product === 'ad';
          
          // Always keep the 'data' record as the main lead
          if (isPremiumListing && !isExistingPremium) {
            // Current is premium listing, existing is main lead - add price to existing
            existing.price = (existing.price || 0) + ((lead as any).price || 0);
            
            // Add note about premium listing
            if (!existing.notesMetadata) existing.notesMetadata = {};
            existing.notesMetadata.hasPremiumListing = true;
            existing.notesMetadata.totalPrice = existing.price;
            existing.notesMetadata.basePrice = existing.price - ((lead as any).price || 0);
            existing.notesMetadata.premiumPrice = (lead as any).price || 0;
            
            premiumListingCount++;
            console.log(`[NextGen Import] Merged premium listing for lead ${key}: +$${(lead as any).price} = $${existing.price} total`);
          } else if (!isPremiumListing && isExistingPremium) {
            // Current is main lead, existing is premium listing - replace with main lead
            const premiumPrice = existing.price || 0;
            dedupMap.set(key, lead);
            const mainLead = dedupMap.get(key);
            mainLead.price = (mainLead.price || 0) + premiumPrice;
            
            // Add note about premium listing
            if (!mainLead.notesMetadata) mainLead.notesMetadata = {};
            mainLead.notesMetadata.hasPremiumListing = true;
            mainLead.notesMetadata.totalPrice = mainLead.price;
            mainLead.notesMetadata.basePrice = (mainLead.price || 0) - premiumPrice;
            mainLead.notesMetadata.premiumPrice = premiumPrice;
            
            premiumListingCount++;
            console.log(`[NextGen Import] Merged premium listing for lead ${key}: +$${premiumPrice} = $${mainLead.price} total`);
          } else {
            // Both are same type - just sum prices (fallback behavior)
            existing.price = (existing.price || 0) + ((lead as any).price || 0);
            console.warn(`[NextGen Import] Duplicate ${existing.product || 'unknown'} record for lead ${key}, summing prices: $${existing.price}`);
          }
        } else {
          dedupMap.set(key, lead);
        }
      }
      
      parseResult.leads = Array.from(dedupMap.values());
      
      if (premiumListingCount > 0) {
        console.log(`[NextGen Import] Processed ${premiumListingCount} premium listings`);
      }
    }

    // Cleanup temp file ASAP
    fs.unlinkSync(req.file.path);

    if (parseResult.errors.length > 0 && parseResult.vendor !== 'UNKNOWN') {
      return res.status(400).json({ error: 'CSV parsing failed', details: parseResult.errors });
    }

    const tenantId = req.user._id;
    const assignedTo = req.user._id;

    let imported = 0;
    let updated = 0;

    for (const lead of parseResult.leads) {
      try {
        // Coerce unknown status strings to 'New' to satisfy enum validation
        let status = (lead as any).status;
        const allowedStatuses = ['New', 'Contacted', 'Follow-up', 'Won', 'Lost'];
        if (!allowedStatuses.includes(status)) {
          status = 'New';
        }

        // Add premium listing info to notes if applicable
        let notes = (lead as any).notes || '';
        if ((lead as any).notesMetadata?.hasPremiumListing) {
          const premiumNote = `\n\n💎 Premium Listing Applied:\n` +
            `Base Price: $${(lead as any).notesMetadata.basePrice}\n` +
            `Premium Listing: $${(lead as any).notesMetadata.premiumPrice}\n` +
            `Total Price: $${(lead as any).notesMetadata.totalPrice}`;
          notes = notes ? notes + premiumNote : premiumNote.trim();
        }

        const { isNew } = await (LeadModel as any).upsertLead({
          ...lead,
          status,
          notes,
          tenantId,
          assignedTo,
          source: lead.source || getVendorDisplayName(parseResult.vendor) || 'CSV Import',
        });

        if (isNew) {
          imported++;
          broadcastNewLeadNotification({
            leadId: lead.phone || lead.email || 'unknown', // fallback id
            name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead',
            source: lead.source || 'CSV',
            isNew: true,
          });
        } else {
          updated++;
        }
      } catch (err) {
        console.error('[csv-upload] Lead upsert failed', err, lead);
      }
    }

    return res.json({
      success: true,
      vendor: parseResult.vendor === 'UNKNOWN' ? 'Unknown' : getVendorDisplayName(parseResult.vendor),
      stats: { imported, updated, processed: parseResult.leads.length },
    });
  } catch (err: any) {
    console.error('CSV upload error', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router; 