import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { upsertLead } from '../models/Lead';

const router = Router();

// Middleware for auth - placeholder implementation
const auth = (req: Request, res: Response, next: any) => {
  // Simple auth check - in production this would verify API keys, JWT, etc.
  next();
};

router.post('/nextgen', auth, async (req: Request, res: Response) => {
  const {
    dob,
    weight,
    source_hash,         // <-- keep raw for mapping helper
    campaign_name,
    ...leadPayload
  } = req.body;

  try {
    const { lead, isNew } = await upsertLead({
      ...leadPayload,
      dob,
      weight,
      source_hash,
      campaign_name,
      source: 'NextGen'
    });

    return res.status(200).json({
      success: true,
      leadId: (lead._id as mongoose.Types.ObjectId).toString(),
      isNew
    });
  } catch (err: any) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

export default router;