"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get user settings
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        // Return default settings for now
        return res.json({
            user: req.user.id,
            theme: 'system',
            notificationPreferences: {
                email: true,
                sms: false,
                inApp: true,
            },
            customFields: [],
        });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});
// Update user settings
router.put('/', auth_1.authenticate, async (req, res) => {
    try {
        const { theme, notificationPreferences, customFields } = req.body;
        // Return the updated settings without actually saving them
        return res.json({
            user: req.user.id,
            theme: theme || 'system',
            notificationPreferences: notificationPreferences || {
                email: true,
                sms: false,
                inApp: true,
            },
            customFields: customFields || [],
            updatedAt: new Date(),
        });
    }
    catch (error) {
        console.error('Error updating settings:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
