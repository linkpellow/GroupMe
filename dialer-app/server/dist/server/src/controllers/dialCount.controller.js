"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDialCounts = exports.incrementDialCount = void 0;
const dialCount_service_1 = __importDefault(require("../services/dialCount.service"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * POST /api/dial-counts/increment
 * Body: { phone: string }
 * Increments the lifetime counter for the current user and returns the new total.
 */
const incrementDialCount = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { phone } = req.body;
        if (!userId)
            return res.status(401).json({ message: 'Unauthenticated' });
        if (!phone)
            return res.status(400).json({ message: 'Missing phone' });
        const updated = await dialCount_service_1.default.increment(new mongoose_1.default.Types.ObjectId(userId), phone);
        return res.json({ phone: updated.phone, count: updated.count });
    }
    catch (err) {
        console.error('incrementDialCount error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};
exports.incrementDialCount = incrementDialCount;
/**
 * GET /api/dial-counts?phones=123,456
 * Returns counts map for provided phones.
 */
const getDialCounts = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthenticated' });
        const phonesParam = req.query.phones;
        if (!phonesParam)
            return res.json({ counts: {} });
        const phones = phonesParam.split(',').filter(Boolean);
        const counts = await dialCount_service_1.default.getCounts(new mongoose_1.default.Types.ObjectId(userId), phones);
        return res.json({ counts });
    }
    catch (err) {
        console.error('getDialCounts error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};
exports.getDialCounts = getDialCounts;
