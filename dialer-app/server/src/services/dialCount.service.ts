import mongoose from 'mongoose';
import DialCountModel, { IDialCount } from '../models/DialCount';
import { normalizePhone } from '@shared/utils/phoneUtils';

/**
 * Service for creating and retrieving lifetime dial counts per phone & user.
 */
export default class DialCountService {
  /**
   * Increment the dial counter for the given user+phone. Returns the updated document.
   */
  static async increment(userId: mongoose.Types.ObjectId, phone: string): Promise<IDialCount> {
    const clean = normalizePhone(phone);
    const now = new Date();

    return await DialCountModel.findOneAndUpdate(
      { userId, phone: clean },
      { $inc: { count: 1 }, $set: { lastDialedAt: now } },
      { new: true, upsert: true }
    ).exec();
  }

  /**
   * Bulk fetch counts for a list of phone numbers (any format). Returns a map of phone→count.
   */
  static async getCounts(
    userId: mongoose.Types.ObjectId,
    phones: string[]
  ): Promise<Record<string, number>> {
    if (phones.length === 0) return {};
    const cleaned = phones.map(normalizePhone);

    const docs = await DialCountModel.find({ userId, phone: { $in: cleaned } }).lean().exec();
    const map: Record<string, number> = {};
    for (const doc of docs) {
      map[doc.phone] = doc.count;
    }
    return map;
  }
} 