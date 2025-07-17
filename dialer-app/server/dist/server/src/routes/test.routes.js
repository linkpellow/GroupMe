"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
// This entire route is for development and testing purposes only.
// It should not be exposed in a production environment.
router.get('/broadcast', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        logger_1.default.warn('Attempted to access dev-only test broadcast endpoint in production.');
        return res.status(404).send('Not found');
    }
    try {
        const leadData = {
            leadId: `test_${Date.now()}`,
            name: 'Dev Test Lead',
            source: 'NextGen',
            isNew: true,
        };
        logger_1.default.info('Broadcasting a test lead notification via /api/test/broadcast');
        (0, index_1.broadcastNewLeadNotification)(leadData);
        res.status(200).json({
            success: true,
            message: 'Test lead notification broadcasted.',
            data: leadData,
        });
    }
    catch (error) {
        logger_1.default.error('Failed to broadcast test notification:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during test broadcast.',
            error: error.message,
        });
    }
});
exports.default = router;
