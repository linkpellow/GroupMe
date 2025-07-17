"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DialCount_1 = __importDefault(require("../models/DialCount"));
const phoneUtils_1 = require("@shared/utils/phoneUtils");
/**
 * Service for creating and retrieving lifetime dial counts per phone & user.
 */
class DialCountService {
    /**
     * Increment the dial counter for the given user+phone. Returns the updated document.
     */
    static async increment(userId, phone) {
        const clean = (0, phoneUtils_1.normalizePhone)(phone);
        const now = new Date();
        return await DialCount_1.default.findOneAndUpdate({ userId, phone: clean }, { $inc: { count: 1 }, $set: { lastDialedAt: now } }, { new: true, upsert: true }).exec();
    }
    /**
     * Bulk fetch counts for a list of phone numbers (any format). Returns a map of phone→count.
     */
    static async getCounts(userId, phones) {
        if (phones.length === 0)
            return {};
        const cleaned = phones.map(phoneUtils_1.normalizePhone);
        const docs = await DialCount_1.default.find({ userId, phone: { $in: cleaned } })
            .lean()
            .exec();
        const map = {};
        for (const doc of docs) {
            map[doc.phone] = doc.count;
        }
        return map;
    }
}
exports.default = DialCountService;
