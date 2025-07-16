"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Lead_1 = __importDefault(require("../models/Lead"));
const winston_1 = __importDefault(require("winston"));
const zod_1 = require("zod");
const Sentry = __importStar(require("@sentry/node"));
const index_1 = require("../index");
const router = express_1.default.Router();
// Winston logger configuration
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    defaultMeta: { service: 'webhook-service' },
    transports: [
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }),
    ],
});
// Middleware to verify NextGen credentials (per-tenant)
const NextGenCredential_1 = __importDefault(require("../models/NextGenCredential"));
const verifyNextGenAuth = async (req, res, next) => {
    try {
        const { sid, apikey } = req.headers;
        if (!sid || !apikey) {
            return res.status(401).json({ success: false, message: 'Missing creds' });
        }
        // Look up active credential
        const cred = await NextGenCredential_1.default.findOne({ sid, apiKey: apikey, active: true }).lean();
        if (!cred) {
            // Legacy env-var fallback for admin tenant
            if (sid === process.env.NEXTGEN_SID && apikey === process.env.NEXTGEN_API_KEY) {
                req.tenantId = process.env.ADMIN_TENANT_ID || null;
                return next();
            }
            logger.warn('Invalid NextGen credentials attempted', { sid: sid.substring(0, 5) + '...', ip: req.ip });
            return res.status(401).json({ success: false, message: 'Bad creds' });
        }
        // Attach tenantId for controller to use in upsert
        req.tenantId = cred.tenantId;
        return next();
    }
    catch (err) {
        logger.error('verifyNextGenAuth error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
// Zod schema for NextGen webhook payload
const NextGenLeadSchema = zod_1.z.object({
    lead_id: zod_1.z.string().optional(),
    nextgen_id: zod_1.z.string().optional(),
    // Contact information
    first_name: zod_1.z.string().optional(),
    last_name: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    phone_number: zod_1.z.string().optional(),
    // Location
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().length(2).optional(),
    zip_code: zod_1.z.string().optional(),
    street_address: zod_1.z.string().optional(),
    // Demographics
    dob: zod_1.z.string().optional(), // preferred
    date_of_birth: zod_1.z.string().optional(), // some vendors send this
    age: zod_1.z.number().optional(),
    gender: zod_1.z.string().optional(),
    height: zod_1.z.string().optional(),
    weight: zod_1.z.string().optional(),
    // Health information
    tobacco_user: zod_1.z.boolean().optional(),
    pregnant: zod_1.z.boolean().optional(),
    has_prescription: zod_1.z.boolean().optional(),
    has_medicare_parts_ab: zod_1.z.boolean().optional(),
    has_medical_condition: zod_1.z.boolean().optional(),
    medical_conditions: zod_1.z.array(zod_1.z.string()).optional(),
    // Household
    household_size: zod_1.z.string().optional(),
    household_income: zod_1.z.string().optional(),
    // Campaign data
    campaign_name: zod_1.z.string().optional(),
    product: zod_1.z.string().optional(),
    vendor_name: zod_1.z.string().optional(),
    account_name: zod_1.z.string().optional(),
    bid_type: zod_1.z.string().optional(),
    price: zod_1.z.string().optional(),
    // Call tracking
    call_log_id: zod_1.z.string().optional(),
    call_duration: zod_1.z.string().optional(),
    source_hash: zod_1.z.string().optional(),
    sub_id_hash: zod_1.z.string().optional(),
});
// Adapter to convert NextGen format to our Lead schema
const adaptNextGenLead = (nextgenData) => {
    // Convert numeric height in inches (e.g. "70") → `5'10"`. Fallback to raw string if parsing fails.
    let formattedHeight = undefined;
    if (nextgenData.height) {
        const numeric = parseInt(nextgenData.height.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(numeric) && numeric > 0) {
            const feet = Math.floor(numeric / 12);
            const inches = numeric % 12;
            formattedHeight = `${feet}'${inches}"`;
        }
        else {
            // Keep original if parsing fails (e.g. already formatted or contains non-numeric)
            formattedHeight = nextgenData.height.trim();
        }
    }
    // Normalize weight – trim and keep as-is (string) so UI can display
    const formattedWeight = nextgenData.weight ? nextgenData.weight.trim() : undefined;
    // Keep DOB as provided (MM/DD/YY) so UI can parse consistently
    const formattedDob = (nextgenData.dob || nextgenData.date_of_birth)?.trim();
    // Format gender (capitalize first letter)
    let formattedGender = undefined;
    if (nextgenData.gender) {
        if (nextgenData.gender.toLowerCase().startsWith('m')) {
            formattedGender = 'Male';
        }
        else if (nextgenData.gender.toLowerCase().startsWith('f')) {
            formattedGender = 'Female';
        }
    }
    const adapted = {
        // IDs
        nextgenId: nextgenData.nextgen_id || nextgenData.lead_id,
        // Name
        firstName: nextgenData.first_name,
        lastName: nextgenData.last_name,
        name: [nextgenData.first_name, nextgenData.last_name].filter(Boolean).join(' ') || 'NextGen Lead',
        // Contact
        email: nextgenData.email,
        phone: nextgenData.phone ?? nextgenData.phone_number,
        // Location
        city: nextgenData.city?.trim(),
        state: nextgenData.state?.toUpperCase()?.trim(),
        zipcode: nextgenData.zip_code?.trim(),
        street1: nextgenData.street_address?.trim(),
        // Demographics - with consistent formatting
        dob: formattedDob,
        gender: formattedGender,
        height: formattedHeight,
        weight: formattedWeight,
        // Health
        tobaccoUser: nextgenData.tobacco_user,
        pregnant: nextgenData.pregnant,
        hasPrescription: nextgenData.has_prescription,
        hasMedicarePartsAB: nextgenData.has_medicare_parts_ab,
        hasMedicalCondition: nextgenData.has_medical_condition,
        medicalConditions: nextgenData.medical_conditions,
        // Household
        householdSize: nextgenData.household_size,
        householdIncome: nextgenData.household_income,
        // Campaign
        campaignName: nextgenData.campaign_name,
        product: nextgenData.product,
        vendorName: nextgenData.vendor_name,
        accountName: nextgenData.account_name,
        bidType: nextgenData.bid_type,
        price: nextgenData.price ? parseFloat(nextgenData.price) : undefined,
        // Call tracking
        callLogId: nextgenData.call_log_id,
        callDuration: nextgenData.call_duration ? parseInt(nextgenData.call_duration) : undefined,
        sourceHash: nextgenData.source_hash,
        subIdHash: nextgenData.sub_id_hash,
        // Defaults
        source: 'NextGen', // Changed to match the enum in Lead model
        disposition: 'New Lead', // Changed to match other imports
        status: 'New',
    };
    // Remove undefined values
    Object.keys(adapted).forEach((key) => {
        if (adapted[key] === undefined) {
            delete adapted[key];
        }
    });
    return adapted;
};
// POST /api/webhooks/nextgen
router.post('/nextgen', verifyNextGenAuth, async (req, res) => {
    const startTime = Date.now();
    let leadId;
    try {
        // Validate request body
        const validationResult = NextGenLeadSchema.safeParse(req.body);
        if (!validationResult.success) {
            logger.error('NextGen webhook validation failed', {
                errors: validationResult.error.errors,
                body: req.body,
            });
            return res.status(400).json({
                success: false,
                message: 'Invalid payload format',
                errors: validationResult.error.errors,
            });
        }
        // Adapt lead data (full) but we'll upsert minimal first for speed
        const fullLeadData = adaptNextGenLead(validationResult.data);
        // Broadcast minimal stub ASAP for instant UI feedback (no DB wait)
        try {
            (0, index_1.broadcastNewLeadNotification)({
                name: fullLeadData.name,
                source: 'NextGen',
                isNew: true,
            });
        }
        catch (stubErr) {
            logger.warn('Stub notification failed', stubErr);
        }
        if (!fullLeadData.email && !fullLeadData.phone) {
            logger.error('NextGen lead missing both email and phone', {
                nextgenId: fullLeadData.nextgenId,
            });
            return res.status(400).json({
                success: false,
                message: 'Lead must have either email or phone',
            });
        }
        // Build minimal payload for fast upsert
        const minimal = {
            nextgenId: fullLeadData.nextgenId,
            firstName: fullLeadData.firstName,
            lastName: fullLeadData.lastName,
            name: fullLeadData.name,
            email: fullLeadData.email,
            phone: fullLeadData.phone,
            source: 'NextGen',
            disposition: 'New Lead',
            status: 'New',
        };
        const { lead, isNew } = await Lead_1.default.upsertLead(minimal);
        leadId = lead._id.toString();
        // Async update with heavy fields (non-blocking)
        setImmediate(async () => {
            try {
                await Lead_1.default.updateOne({ _id: leadId }, { $set: fullLeadData });
            }
            catch (e) {
                console.error('Async enrich lead failed', e);
            }
        });
        // Log success
        logger.info('NextGen lead processed successfully', {
            leadId,
            nextgenId: fullLeadData.nextgenId,
            isNew,
            duration: Date.now() - startTime,
        });
        // Compute processing time
        const processMs = Date.now() - startTime;
        // Broadcast notification if available
        if (typeof index_1.broadcastNewLeadNotification === 'function' && leadId) {
            try {
                (0, index_1.broadcastNewLeadNotification)({
                    leadId,
                    name: fullLeadData.name,
                    source: 'NextGen',
                    isNew,
                    processMs,
                });
            }
            catch (broadcastError) {
                logger.error('Failed to broadcast lead notification', broadcastError);
            }
        }
        // Expose timing header
        res.set('X-Process-Time', processMs.toString());
        // Send success response
        res.status(isNew ? 201 : 200).json({
            success: true,
            leadId,
            message: `Lead successfully ${isNew ? 'created' : 'updated'}`,
            isNew,
            processMs,
        });
    }
    catch (error) {
        logger.error('NextGen webhook error', {
            error: error.message,
            stack: error.stack,
            leadId,
            body: req.body,
            duration: Date.now() - startTime,
        });
        // Send to Sentry if configured
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(error, {
                tags: {
                    webhook: 'nextgen',
                    leadId: leadId || 'unknown',
                },
                extra: {
                    body: req.body,
                },
            });
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error processing lead',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'webhook',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
