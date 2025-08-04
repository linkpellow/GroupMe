"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCallHistory = exports.handleCallStatus = exports.initiateCall = void 0;
const Call_1 = __importDefault(require("../models/Call"));
const twilio_1 = __importDefault(require("../services/twilio"));
const initiateCall = async (req, res) => {
    try {
        const { leadId, phone } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const result = await twilio_1.default.initiateCall(phone, process.env.TWILIO_PHONE_NUMBER || '', leadId);
        if (!result.success) {
            return res.status(500).json({ message: result.error || 'Failed to initiate call' });
        }
        res.json({ message: 'Call initiated successfully' });
    }
    catch (error) {
        console.error('Error initiating call:', error);
        res.status(500).json({ message: 'Error initiating call' });
    }
};
exports.initiateCall = initiateCall;
const handleCallStatus = async (req, res) => {
    try {
        const { CallSid, CallStatus, CallDuration } = req.body;
        if (!CallSid || !CallStatus) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }
        await twilio_1.default.handleCallStatus(CallSid, CallStatus, CallDuration);
        res.json({ message: 'Call status updated successfully' });
    }
    catch (error) {
        console.error('Error handling call status:', error);
        res.status(500).json({ message: 'Error handling call status' });
    }
};
exports.handleCallStatus = handleCallStatus;
const getCallHistory = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const calls = await Call_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .populate('leadId', 'name phone email');
        res.json(calls);
    }
    catch (error) {
        console.error('Error fetching call history:', error);
        res.status(500).json({ message: 'Error fetching call history' });
    }
};
exports.getCallHistory = getCallHistory;
