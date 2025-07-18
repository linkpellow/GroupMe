"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csvParser_1 = require("../utils/csvParser");
const auth_1 = require("../middleware/auth");
const Lead_1 = __importDefault(require("../models/Lead"));
const index_1 = require("../index");
// Configure multer for CSV uploads (max 50 MB, single file)
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.resolve(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir))
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv'))
            cb(null, true);
        else
            cb(new Error('Only CSV files are allowed'));
    },
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
        files: 1,
    },
});
const router = express_1.default.Router();
/**
 * POST /api/csv-upload
 * Authenticated CSV import that stamps tenantId + assignedTo.
 */
router.post('/', auth_1.auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ error: 'User authentication failed' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded' });
        }
        // Read file
        const fileBuffer = fs_1.default.readFileSync(req.file.path);
        // Parse with vendor-aware helper
        const parseResult = await (0, csvParser_1.parseVendorCSV)(fileBuffer, { skipEmptyLines: true, maxRows: 15000 });
        // Deduplicate NextGen rows (ad + data) by leadId and sum price
        if (parseResult.vendor === 'NEXTGEN') {
            const dedupMap = new Map();
            for (const lead of parseResult.leads) {
                const key = lead.leadId || lead.phone || lead.email || Math.random().toString();
                if (dedupMap.has(key)) {
                    const existing = dedupMap.get(key);
                    existing.price = (existing.price || 0) + lead.price;
                }
                else {
                    dedupMap.set(key, lead);
                }
            }
            parseResult.leads = Array.from(dedupMap.values());
        }
        // Cleanup temp file ASAP
        fs_1.default.unlinkSync(req.file.path);
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
                let status = lead.status;
                const allowedStatuses = ['New', 'Contacted', 'Follow-up', 'Won', 'Lost'];
                if (!allowedStatuses.includes(status)) {
                    status = 'New';
                }
                const { isNew } = await Lead_1.default.upsertLead({
                    ...lead,
                    status,
                    tenantId,
                    assignedTo,
                    source: lead.source || (0, csvParser_1.getVendorDisplayName)(parseResult.vendor) || 'CSV Import',
                });
                if (isNew) {
                    imported++;
                    (0, index_1.broadcastNewLeadNotification)({
                        leadId: lead.phone || lead.email || 'unknown', // fallback id
                        name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead',
                        source: lead.source || 'CSV',
                        isNew: true,
                    });
                }
                else {
                    updated++;
                }
            }
            catch (err) {
                console.error('[csv-upload] Lead upsert failed', err, lead);
            }
        }
        return res.json({
            success: true,
            vendor: parseResult.vendor === 'UNKNOWN' ? 'Unknown' : (0, csvParser_1.getVendorDisplayName)(parseResult.vendor),
            stats: { imported, updated, processed: parseResult.leads.length },
        });
    }
    catch (err) {
        console.error('CSV upload error', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});
exports.default = router;
