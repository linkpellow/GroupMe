"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
// Apply auth middleware
router.use(auth_1.authenticate);
// Get user's Calendly integration
router.get('/calendly', async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Check if user has Calendly integration
        if (!user.integrations || !user.integrations.calendly) {
            return res.status(200).json({
                success: true,
                message: 'No Calendly integration found',
                connected: false,
                token: null,
                user: null,
                events: [],
            });
        }
        // Return Calendly integration details without exposing the full token
        const { token, user: calendlyUser, events } = user.integrations.calendly;
        return res.status(200).json({
            success: true,
            connected: true,
            token: token ? '•••••••••••••••' : null, // Mask token for security
            user: calendlyUser,
            events,
        });
    }
    catch (error) {
        console.error('Error fetching Calendly integration:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch Calendly integration',
        });
    }
});
// Connect Calendly integration
router.post('/calendly', async (req, res) => {
    try {
        const userId = req.user._id;
        const { token, user: calendlyUser } = req.body;
        if (!token || !calendlyUser) {
            return res.status(400).json({ success: false, message: 'Token and user are required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Initialize integrations object if it doesn't exist
        if (!user.integrations) {
            user.integrations = {};
        }
        // Set Calendly integration
        user.integrations.calendly = {
            token,
            user: calendlyUser,
            events: [],
            connectedAt: new Date(),
        };
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Calendly integration connected successfully',
        });
    }
    catch (error) {
        console.error('Error connecting Calendly integration:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to connect Calendly integration',
        });
    }
});
// Disconnect Calendly integration
router.delete('/calendly', async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Remove Calendly integration
        if (user.integrations && user.integrations.calendly) {
            delete user.integrations.calendly;
            await user.save();
        }
        return res.status(200).json({
            success: true,
            message: 'Calendly integration disconnected successfully',
        });
    }
    catch (error) {
        console.error('Error disconnecting Calendly integration:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to disconnect Calendly integration',
        });
    }
});
// Update Calendly events
router.put('/calendly/events', async (req, res) => {
    try {
        const userId = req.user._id;
        const { events } = req.body;
        if (!Array.isArray(events)) {
            return res.status(400).json({ success: false, message: 'Events must be an array' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Check if user has Calendly integration
        if (!user.integrations || !user.integrations.calendly) {
            return res.status(400).json({ success: false, message: 'Calendly integration not found' });
        }
        // Update events
        user.integrations.calendly.events = events;
        await user.save();
        return res.status(200).json({ success: true, message: 'Calendly events updated successfully' });
    }
    catch (error) {
        console.error('Error updating Calendly events:', error);
        return res.status(500).json({ success: false, message: 'Failed to update Calendly events' });
    }
});
exports.default = router;
