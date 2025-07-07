import express, { Request, Response, NextFunction, Router } from 'express';
import Lead from '../models/Lead';
import winston from 'winston';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
import { broadcastNewLeadNotification } from '../index';

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

// Middleware to verify NextGen credentials
const verifyNextGenAuth = (req: Request, res: Response, next: NextFunction) => {
  const { sid, apikey } = req.headers;

  if (!process.env.NEXTGEN_SID || !process.env.NEXTGEN_API_KEY) {
    logger.error('NextGen credentials not configured in environment');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
    });
  }

  if (sid !== process.env.NEXTGEN_SID || apikey !== process.env.NEXTGEN_API_KEY) {
    logger.warn('Invalid NextGen credentials attempted', {
      sid: sid?.toString().substring(0, 5) + '...',
      ip: req.ip,
    });
    return res.status(401).json({
      success: false,
      message: 'Bad creds',
    });
  }

  next();
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

  // Location
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  zip_code: z.string().optional(),
  street_address: z.string().optional(),

  // Demographics
  dob: z.string().optional(),
  age: z.number().optional(),
  gender: z.enum(['M', 'F', 'Male', 'Female']).optional(),
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
  // Format height where first digit is feet and remaining digits are inches
  let formattedHeight = nextgenData.height;
  if (nextgenData.height && nextgenData.height.length >= 2) {
    const feet = nextgenData.height.charAt(0);
    const inches = nextgenData.height.substring(1);
    formattedHeight = `${feet}'${inches}"`;
  }

  // Format date of birth
  const formattedDob = nextgenData.dob ? new Date(nextgenData.dob).toLocaleDateString() : undefined;

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
    phone: nextgenData.phone,

    // Location
    city: nextgenData.city?.trim(),
    state: nextgenData.state?.toUpperCase()?.trim(),
    zipcode: nextgenData.zip_code?.trim(),
    street1: nextgenData.street_address?.trim(),

    // Demographics - with consistent formatting
    dob: formattedDob,
    gender: formattedGender,
    height: formattedHeight,
    weight: nextgenData.weight,

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
    disposition: 'New Lead' as const,  // Changed to match other imports
    status: 'New' as const,
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

    // Adapt the lead data
    const leadData = adaptNextGenLead(validationResult.data);

    // Ensure we have minimum required data
    if (!leadData.email && !leadData.phone) {
      logger.error('NextGen lead missing both email and phone', {
        nextgenId: leadData.nextgenId,
      });

      return res.status(400).json({
        success: false,
        message: 'Lead must have either email or phone',
      });
    }

    // Upsert the lead
    const { lead, isNew } = await (Lead as any).upsertLead(leadData);
    leadId = lead._id.toString();

    // Log success
    logger.info('NextGen lead processed successfully', {
      leadId,
      nextgenId: leadData.nextgenId,
      isNew,
      duration: Date.now() - startTime,
    });

    // Broadcast notification if available
    if (typeof broadcastNewLeadNotification === 'function' && leadId) {
      try {
        broadcastNewLeadNotification({
          leadId,
          name: leadData.name,
          source: 'NextGen',
          isNew,
        });
      } catch (broadcastError) {
        logger.error('Failed to broadcast lead notification', broadcastError);
      }
    }

    // Send success response
    res.status(isNew ? 201 : 200).json({
      success: true,
      leadId,
      message: `Lead successfully ${isNew ? 'created' : 'updated'}`,
      isNew,
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
