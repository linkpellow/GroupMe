import express, { Request, Response, NextFunction, Router } from 'express';
import Lead from '../models/Lead';
import winston from 'winston';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
import { broadcastNewLeadNotification } from '../index';
import { processNextGenLead, getDeduplicationKey } from '../services/nextgenDeduplicationService';

const router: Router = express.Router();

// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'webhook-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Middleware to verify NextGen credentials (per-tenant)
import NextGenCredential from '../models/NextGenCredential';

const verifyNextGenAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sid, apikey } = req.headers as Record<string, string | undefined>;

    if (!sid || !apikey) {
      return res.status(401).json({ success: false, message: 'Missing creds' });
    }

    // Look up active credential
    const cred = await NextGenCredential.findOne({ sid, apiKey: apikey, active: true }).lean();

    if (!cred) {
      // Legacy env-var fallback for admin tenant
      if (sid === process.env.NEXTGEN_SID && apikey === process.env.NEXTGEN_API_KEY) {
        (req as any).tenantId = process.env.ADMIN_TENANT_ID || null;
        return next();
      }

      logger.warn('Invalid NextGen credentials attempted', { sid: sid.substring(0,5)+'...', ip: req.ip });
      return res.status(401).json({ success: false, message: 'Bad creds' });
    }

    // Attach tenantId for controller to use in upsert
    (req as any).tenantId = cred.tenantId;
    return next();
  } catch (err) {
    logger.error('verifyNextGenAuth error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Zod schema for NextGen webhook payload
const NextGenLeadSchema = z.object({
  lead_id: z.string().optional(),
  nextgen_id: z.string().optional(),

  // Contact information
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  phone_number: z.string().optional(),

  // Location
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  zip_code: z.string().optional(),
  street_address: z.string().optional(),

  // Demographics
  dob: z.string().optional(), // preferred
  date_of_birth: z.string().optional(), // some vendors send this
  age: z.number().optional(),
  gender: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),

  // Health information
  tobacco_user: z.boolean().optional(),
  pregnant: z.boolean().optional(),
  has_prescription: z.boolean().optional(),
  has_medicare_parts_ab: z.boolean().optional(),
  has_medical_condition: z.boolean().optional(),
  medical_conditions: z.array(z.string()).optional(),

  // Household
  household_size: z.string().optional(),
  household_income: z.string().optional(),

  // Campaign data
  campaign_name: z.string().optional(),
  product: z.string().optional(),
  vendor_name: z.string().optional(),
  account_name: z.string().optional(),
  bid_type: z.string().optional(),
  price: z.string().optional(),

  // Call tracking
  call_log_id: z.string().optional(),
  call_duration: z.string().optional(),
  source_hash: z.string().optional(),
  sub_id_hash: z.string().optional(),
});

type NextGenLeadData = z.infer<typeof NextGenLeadSchema>;

// Adapter to convert NextGen format to our Lead schema
const adaptNextGenLead = (nextgenData: NextGenLeadData) => {
  // Convert numeric height in inches (e.g. "70") → `5'10"`. Fallback to raw string if parsing fails.
  let formattedHeight: string | undefined = undefined;
  if (nextgenData.height) {
    const numeric = parseInt(nextgenData.height.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numeric) && numeric > 0) {
      const feet = Math.floor(numeric / 12);
      const inches = numeric % 12;
      formattedHeight = `${feet}'${inches}"`;
    } else {
      // Keep original if parsing fails (e.g. already formatted or contains non-numeric)
      formattedHeight = nextgenData.height.trim();
    }
  }

  // Normalize weight – trim and keep as-is (string) so UI can display
  const formattedWeight = nextgenData.weight ? nextgenData.weight.trim() : undefined;

  // Keep DOB as provided (MM/DD/YY) so UI can parse consistently
  const formattedDob = (nextgenData.dob || (nextgenData as any).date_of_birth)?.trim();

  // Format gender (capitalize first letter)
  let formattedGender = undefined;
  if (nextgenData.gender) {
    if (nextgenData.gender.toLowerCase().startsWith('m')) {
      formattedGender = 'Male';
    } else if (nextgenData.gender.toLowerCase().startsWith('f')) {
      formattedGender = 'Female';
    }
  }

  const adapted = {
    // IDs
    nextgenId: nextgenData.nextgen_id || nextgenData.lead_id,

    // Name
    firstName: nextgenData.first_name,
    lastName: nextgenData.last_name,
    name:
      [nextgenData.first_name, nextgenData.last_name].filter(Boolean).join(' ') || 'NextGen Lead',

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
    source: 'NextGen' as const,  // Changed to match the enum in Lead model
    sourceCode: nextgenData.campaign_name || nextgenData.vendor_name || 'NextGen', // Use campaign name as source code
    disposition: 'New Lead' as const,  // Changed to match other imports
    status: 'New' as const,

    // Purchase timestamp — try multiple possible field names
    createdAt: (() => {
      const raw =
        (nextgenData as any).created_at ||
        (nextgenData as any).created ||
        (nextgenData as any).order_time;
      if (!raw) return undefined;
      const dt = new Date(raw);
      return isNaN(dt.getTime()) ? undefined : dt;
    })(),
  };

  // Remove undefined values
  Object.keys(adapted).forEach((key) => {
    if (adapted[key as keyof typeof adapted] === undefined) {
      delete adapted[key as keyof typeof adapted];
    }
  });

  return adapted;
};

// POST /api/webhooks/nextgen
router.post('/nextgen', verifyNextGenAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  let leadId: string | undefined;

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

    // Get tenant ID for this request
    const tenantId = (req as any).tenantId;

    // Broadcast minimal stub ASAP for instant UI feedback (no DB wait)
    try {
      broadcastNewLeadNotification({
        name: fullLeadData.name,
        source: 'NextGen',
        isNew: true,
      });
    } catch (stubErr) {
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

    // Check for existing lead using deduplication key
    let existingLead = null;
    const dedupKey = getDeduplicationKey(fullLeadData);
    if (dedupKey) {
      // Build query similar to upsertLead but include nextgenId
      const query: any = { tenantId };
      if (fullLeadData.nextgenId) {
        query.nextgenId = fullLeadData.nextgenId;
      } else if (fullLeadData.phone) {
        query.phone = fullLeadData.phone;
      } else if (fullLeadData.email) {
        query.email = fullLeadData.email;
      }
      
      existingLead = await Lead.findOne(query).lean();
    }

    // Apply deduplication logic
    const deduplicationResult = processNextGenLead(fullLeadData, existingLead);
    
    if (deduplicationResult.logMessage) {
      logger.info('[NextGen Webhook] ' + deduplicationResult.logMessage);
    }

    // Process based on deduplication result
    let lead;
    let isNew = false;
    
    if (deduplicationResult.action === 'create') {
      // Create new lead
      const minimal = {
        nextgenId: deduplicationResult.leadData.nextgenId,
        firstName: deduplicationResult.leadData.firstName,
        lastName: deduplicationResult.leadData.lastName,
        name: deduplicationResult.leadData.name,
        email: deduplicationResult.leadData.email,
        phone: deduplicationResult.leadData.phone,
        createdAt: deduplicationResult.leadData.createdAt,
        source: 'NextGen' as const,
        sourceCode: deduplicationResult.leadData.sourceCode,
        disposition: 'New Lead' as const,
        status: 'New' as const,
      };

      const result = await (Lead as any).upsertLead({ ...minimal, tenantId });
      lead = result.lead;
      isNew = result.isNew;
      leadId = lead._id.toString();

      // Async update with heavy fields
      setImmediate(async () => {
        try {
          await Lead.updateOne({ _id: leadId }, { $set: deduplicationResult.leadData });
        } catch (e) {
          console.error('Async enrich lead failed', e);
        }
      });
      
    } else if (deduplicationResult.action === 'update') {
      // Update existing lead with merged data
      lead = await Lead.findByIdAndUpdate(
        existingLead!._id,
        { $set: deduplicationResult.leadData },
        { new: true }
      );
      if (!lead) {
        logger.error('Failed to update lead', { existingLeadId: existingLead!._id });
        return res.status(500).json({
          success: false,
          message: 'Failed to update lead',
        });
      }
      leadId = (lead as any)._id.toString();
      isNew = false;
    } else {
      // Skip - shouldn't happen with current logic
      return res.status(200).json({
        success: true,
        message: 'Lead processing skipped',
        action: deduplicationResult.action,
      });
    }

    // Log success
    logger.info('NextGen lead processed successfully', {
      leadId,
      nextgenId: deduplicationResult.leadData.nextgenId,
      isNew,
      sourceCode: deduplicationResult.leadData.sourceCode,
      product: deduplicationResult.leadData.product,
      price: deduplicationResult.leadData.price,
      duration: Date.now() - startTime,
    });

    // Compute processing time
    const processMs = Date.now() - startTime;

    // Broadcast notification if available
    if (typeof broadcastNewLeadNotification === 'function' && leadId) {
      try {
        broadcastNewLeadNotification({
          leadId,
          name: fullLeadData.name,
          source: 'NextGen',
          isNew,
          processMs,
        });
      } catch (broadcastError) {
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
  } catch (error: any) {
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
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'webhook',
    timestamp: new Date().toISOString(),
  });
});

export default router;
