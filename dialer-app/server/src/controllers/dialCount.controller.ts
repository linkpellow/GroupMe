import { Request, Response } from 'express';
import DialCountService from '../services/dialCount.service';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * POST /api/dial-counts/increment
 * Body: { phone: string }
 * Increments the lifetime counter for the current user and returns the new total.
 */
export const incrementDialCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { phone } = req.body as { phone: string };

    if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
    if (!phone) return res.status(400).json({ message: 'Missing phone' });

    const updated = await DialCountService.increment(new mongoose.Types.ObjectId(userId), phone);

    return res.json({ phone: updated.phone, count: updated.count });
  } catch (err) {
    console.error('incrementDialCount error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/dial-counts?phones=123,456
 * Returns counts map for provided phones.
 */
export const getDialCounts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

    const phonesParam = req.query.phones as string | undefined;
    if (!phonesParam) return res.json({ counts: {} });

    const phones = phonesParam.split(',').filter(Boolean);
    const counts = await DialCountService.getCounts(new mongoose.Types.ObjectId(userId), phones);
    return res.json({ counts });
  } catch (err) {
    console.error('getDialCounts error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}; 