"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const textdripService_1 = require("../services/textdripService");
const Lead_1 = __importDefault(require("../models/Lead"));
const auth_1 = require("../middleware/auth");
const axios_1 = __importDefault(require("axios"));
const User_1 = __importDefault(require("../models/User"));
const textdripService_2 = require("../services/textdripService");
const router = (0, express_1.Router)();
/**
 * GET /api/textdrip/campaigns
 * Fetches all Textdrip campaigns.
 */
router.get("/campaigns", auth_1.auth, async (req, res) => {
    try {
        console.log('GET /api/textdrip/campaigns route hit');
        const userId = req.user._id;
        const user = await User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const data = await (0, textdripService_2.getCampaigns)(user);
        res.json(data);
    }
    catch (e) {
        console.error('TextDrip campaigns error:', e);
        res.status(500).json({ message: e.message || 'Failed to fetch campaigns' });
    }
});
/**
 * POST /api/textdrip/campaign
 * body: { leadId, campaignId, removeExisting?:boolean }
 */
router.post("/campaign", auth_1.auth, async (req, res) => {
    const { leadId, campaignId, removeExisting = false } = req.body;
    console.log('Textdrip add-campaign request:', {
        leadId,
        campaignId,
        removeExisting,
        headers: req.headers
    });
    if (!leadId || !campaignId) {
        return res.status(400).json({ status: false, message: "leadId and campaignId are required" });
    }
    try {
        const service = (0, textdripService_1.createTextdripService)(req.user?.textdripToken);
        const lead = await Lead_1.default.findById(leadId);
        if (!lead) {
            return res.status(404).json({ status: false, message: "Lead not found" });
        }
        // Ensure contact exists in Textdrip and get contactId
        const contactId = await service.ensureContact(lead);
        const result = await service.addCampaignToContact(lead, contactId, campaignId, removeExisting);
        return res.status(200).json(result);
    }
    catch (e) {
        return res.status(400).json({ status: false, message: e.message });
    }
});
/**
 * POST /api/textdrip/quick-drip
 * body: { phone, message, imageId?:string }
 */
router.post("/quick-drip", auth_1.auth, async (req, res) => {
    const { leadId, message, imageId = null } = req.body;
    if (!leadId || !message) {
        return res.status(400).json({ status: false, message: "leadId and message are required" });
    }
    try {
        const service = (0, textdripService_1.createTextdripService)(req.user?.textdripToken);
        const lead = await Lead_1.default.findById(leadId);
        if (!lead) {
            return res.status(404).json({ status: false, message: "Lead not found" });
        }
        const result = await service.sendMessage(lead, message, imageId);
        return res.status(200).json(result);
    }
    catch (e) {
        return res.status(400).json({ status: false, message: e.message });
    }
});
/**
 * POST /api/textdrip/login
 * body: { email, password }
 * Logs the user into TextDrip, stores returned token on their user record.
 */
router.post('/login', auth_1.auth, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'email and password are required' });
    }
    try {
        const tdResp = await axios_1.default.post('https://api.textdrip.com/api/login', {
            email,
            password,
        }, {
            headers: { 'Content-Type': 'application/json' },
        });
        const { token } = tdResp.data || {};
        if (!token) {
            return res.status(400).json({ success: false, message: 'Login response missing token' });
        }
        // Persist token on user
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        req.user.textdripToken = token;
        req.user.textdripConnectedAt = new Date();
        await req.user.save();
        res.json({ success: true, message: 'TextDrip connected', tokenSaved: true });
    }
    catch (error) {
        console.error('TextDrip login error:', error?.response?.data || error.message);
        const message = error?.response?.data?.message || 'Login failed';
        return res.status(400).json({ success: false, message });
    }
});
// POST /api/textdrip/connect
router.post('/connect', auth_1.auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const { baseUrl, email, username, password, apiKey } = req.body;
        const loginEmail = email || username; // support old field name
        if ((!loginEmail || !password) && !apiKey) {
            return res.status(400).json({ message: 'Provide username/password or apiKey' });
        }
        const creds = { baseUrl, username: loginEmail, password, apiKey };
        const details = await (0, textdripService_2.loginToTextDrip)(creds, user);
        res.json({ connected: true, details });
    }
    catch (e) {
        console.error('TextDrip connect error:', e);
        res.status(500).json({ message: e.message || 'Connect failed' });
    }
});
// DELETE /api/textdrip (disconnect)
router.delete('/', auth_1.auth, async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndUpdate(req.user._id, { $unset: { textdrip: '' } }, { new: true });
        res.json({ disconnected: true, user });
    }
    catch (e) {
        console.error('TextDrip disconnect error:', e);
        res.status(500).json({ message: e.message || 'Failed to disconnect' });
    }
});
exports.default = router;
