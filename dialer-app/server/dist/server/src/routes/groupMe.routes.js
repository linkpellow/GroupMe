"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const groupMeController = __importStar(require("../controllers/groupMe.controller"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
// OAuth routes that DO NOT require authentication
router.post('/oauth/callback', groupMeController.handleOAuthCallback);
router.get('/oauth/status', groupMeController.getConnectionStatus);
router.post('/oauth/initiate', groupMeController.initiateOAuth);
// Implicit grant callback (no auth) - MOVED HERE to make it public
router.get('/callback', groupMeController.handleGroupMeImplicitCallback);
// Add token save endpoint (requires authentication)
router.post('/token', auth_1.authenticate, groupMeController.saveGroupMeToken);
// Apply auth middleware for all other routes
router.use(auth_1.authenticate);
// OAuth disconnect requires authentication
router.post('/oauth/disconnect', groupMeController.disconnectGroupMe);
// Manual token submission
router.post('/save-manual-token', groupMeController.saveManualToken);
// Configuration routes
router.get('/config', groupMeController.getConfig);
router.post('/config', groupMeController.saveConfig);
// Groups route
router.get('/groups', groupMeController.getGroups);
// Messages for a specific group route
router.get('/groups/:groupId/messages', groupMeController.getGroupMessages);
// Update group configuration
router.put('/groups/:groupId/config', groupMeController.updateGroupConfig);
// Send a message to a group
router.post('/groups/:groupId/messages', groupMeController.sendMessage);
// Webhook for incoming GroupMe messages
router.post('/webhook', groupMeController.handleWebhook);
// Webhook endpoint with userId parameter (no auth required for webhooks)
router.post('/webhook/:userId', async (req, res) => {
    const { userId } = req.params;
    const message = req.body;
    console.log(`GroupMe Webhook: Received message for user ${userId}, group ${message.group_id}`);
    console.log('Message content:', JSON.stringify(message, null, 2));
    if (!userId) {
        console.error('GroupMe Webhook: Missing userId in webhook URL');
        return res.status(400).send('Missing userId');
    }
    if (message.sender_type === 'bot') {
        console.log('GroupMe Webhook: Ignoring message from bot');
        return res.status(200).send('Bot message ignored');
    }
    try {
        const clientMessage = {
            type: 'NEW_GROUPME_MESSAGE',
            payload: {
                messageId: message.id,
                groupId: message.group_id,
                senderId: message.sender_id,
                senderName: message.name,
                avatarUrl: message.avatar_url,
                text: message.text,
                attachments: message.attachments,
                createdAt: new Date(message.created_at * 1000),
                system: message.system,
            },
        };
        const appUser = await User_1.default.findById(userId);
        if (!appUser) {
            console.warn(`GroupMe Webhook: User ${userId} not found in database. Cannot deliver message.`);
            return res.status(404).send('Application user not found');
        }
        console.log(`GroupMe Webhook: Message processed for user ${userId} via WebSocket`);
        res.status(202).send('Accepted');
    }
    catch (error) {
        console.error('GroupMe Webhook: Error processing message:', error);
        res.status(500).send('Error processing message');
    }
});
exports.default = router;
