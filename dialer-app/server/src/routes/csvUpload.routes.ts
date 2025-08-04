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
        // Upsert through model helper to centralise validation
        const { isNew } = await (LeadModel as any).upsertLead({
          ...lead,
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