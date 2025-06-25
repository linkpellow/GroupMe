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
exports.handleWebhook = exports.saveConfig = exports.getConfig = exports.sendMessage = exports.updateGroupConfig = exports.getGroupMessages = exports.getGroups = exports.initializeGroupMe = exports.getConnectionStatus = exports.disconnectGroupMe = exports.handleOAuthCallback = exports.initiateOAuth = void 0;
const GroupMeConfig_1 = __importDefault(require("../models/GroupMeConfig"));
const GroupMeMessage_1 = __importDefault(require("../models/GroupMeMessage"));
const groupMeService_1 = __importStar(require("../services/groupMeService"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const controllerUtils_1 = require("../utils/controllerUtils");
const secret_1 = require("../utils/secret");
let groupMeServiceInstance = null;
// OAuth Configuration
const GROUPME_CLIENT_ID = process.env.GROUPME_CLIENT_ID || 'YOUR_CLIENT_ID';
const GROUPME_REDIRECT_URI = process.env.GROUPME_REDIRECT_URI || 'http://localhost:5173/groupme/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Encryption helpers
const ENCRYPTION_KEY = (0, secret_1.getEncryptionKey)();
const IV_LENGTH = 16;
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
/**
 * Attempt to decrypt using NEW_KEY (sha256 hash of JWT_SECRET). If that fails, try
 * legacy OLD_KEY (first 32 chars of JWT_SECRET). If both fail, re-throw so callers
 * can decide what to do (e.g., fall back to plaintext token).
 */
function decrypt(encryptedText) {
    // If the stored value doesn't look like our iv:cipherText format, assume it's plain text
    if (!encryptedText.includes(':')) {
        return encryptedText;
    }
    const [ivHex, dataHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(dataHex, 'hex');
    const tryDecrypt = (key) => {
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    };
    // Attempt decryption with both key versions; if all attempts fail, treat value as plaintext
    try {
        // First try the current key (SHA256)
        return tryDecrypt(ENCRYPTION_KEY);
    }
    catch (err) {
        try {
            // Fallback to legacy key derived from substring
            const legacyKey = Buffer.from((process.env.JWT_SECRET || '').substring(0, 32));
            return tryDecrypt(legacyKey);
        }
        catch (_legacyErr) {
            // Final fallback ‑ assume the stored value is plaintext (unencrypted token)
            console.warn('decrypt() failed with both keys ‑ returning original value as plaintext');
            return encryptedText;
        }
    }
}
// Service instance cache - store per userId
const serviceInstances = new Map();
/**
 * Initiate OAuth flow for GroupMe
 */
exports.initiateOAuth = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    const CLIENT_ID = process.env.GROUPME_CLIENT_ID;
    const REDIRECT_URI = process.env.GROUPME_REDIRECT_URI || 'http://localhost:5173/groupme/callback';
    if (!CLIENT_ID) {
        (0, controllerUtils_1.sendError)(res, 500, 'GroupMe client ID not configured', null, 'CONFIG_ERROR');
        return;
    }
    let userId;
    // Get userId from request body or query params (sent from frontend)
    userId = req.body.userId || req.query.userId;
    if (!userId) {
        (0, controllerUtils_1.sendError)(res, 400, 'User ID is required', null, 'MISSING_USER_ID');
        return;
    }
    // Generate state parameter with user info
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    // Set cookie for tracking during OAuth flow
    res.cookie('groupme_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000, // 10 minutes
    });
    const authUrl = `https://oauth.groupme.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&state=${state}`;
    (0, controllerUtils_1.sendSuccess)(res, { authUrl, state });
});
/**
 * Handle OAuth callback and save token
 */
exports.handleOAuthCallback = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    console.log('=== OAUTH CALLBACK DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request cookies:', req.cookies);
    console.log('Request headers:', req.headers);
    const { access_token, state } = req.body;
    console.log('Access token received:', access_token ? 'Yes' : 'No');
    console.log('Token length:', access_token?.length);
    console.log('Token first 20 chars:', access_token?.substring(0, 20));
    console.log('State received:', state);
    if (!access_token || !state) {
        console.error('Missing access token or state');
        (0, controllerUtils_1.sendError)(res, 400, 'Missing access token or state', null, 'INVALID_REQUEST');
        return;
    }
    // Decode and verify state
    let stateData;
    try {
        console.log('Decoding state parameter...');
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        console.log('State decoded successfully:', stateData);
        console.log('State age (ms):', Date.now() - stateData.timestamp);
    }
    catch (error) {
        console.error('Failed to decode state:', error);
        (0, controllerUtils_1.sendError)(res, 400, 'Invalid state parameter', null, 'INVALID_STATE');
        return;
    }
    const { userId } = stateData;
    if (!userId) {
        console.error('No userId in state data');
        (0, controllerUtils_1.sendError)(res, 400, 'User ID not found in state', null, 'INVALID_STATE');
        return;
    }
    console.log('UserId from state:', userId);
    // Validate token with GroupMe API before saving
    console.log('=== VALIDATING TOKEN WITH GROUPME ===');
    let tokenIsValid = false;
    let groupMeUserData = null;
    try {
        const axios = require('axios');
        console.log('Making request to GroupMe API...');
        console.log('Token to validate:', access_token.substring(0, 20) + '...');
        const validationResponse = await axios.get('https://api.groupme.com/v3/users/me', {
            headers: {
                'X-Access-Token': access_token,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        console.log('Token validation successful!');
        console.log('GroupMe user:', validationResponse.data.response);
        tokenIsValid = true;
        groupMeUserData = validationResponse.data.response;
    }
    catch (validationError) {
        console.error('=== TOKEN VALIDATION RESPONSE ===');
        console.error('Status:', validationError.response?.status);
        console.error('Status text:', validationError.response?.statusText);
        console.error('Error data:', validationError.response?.data);
        // Check if it's a network error vs auth error
        if (!validationError.response) {
            console.error('Network error - could not reach GroupMe API');
            (0, controllerUtils_1.sendError)(res, 500, 'Could not reach GroupMe servers. Please try again.', null, 'NETWORK_ERROR');
            return;
        }
        // GroupMe sometimes returns 401 for valid new tokens
        // We'll proceed with saving the token and let the user test it
        if (validationError.response?.status === 401 || validationError.response?.status === 403) {
            console.warn('GroupMe returned 401/403 - this is common for new tokens');
            console.warn('Proceeding with token storage - user can test connection after');
            tokenIsValid = true; // Optimistically assume token is valid
        }
        else {
            console.error('Unexpected error from GroupMe:', validationError.message);
            (0, controllerUtils_1.sendError)(res, 500, 'Failed to validate GroupMe token', null, 'VALIDATION_ERROR');
            return;
        }
    }
    console.log('Token validation result:', tokenIsValid ? 'Valid' : 'Invalid');
    if (!tokenIsValid) {
        (0, controllerUtils_1.sendError)(res, 400, 'Invalid GroupMe access token', null, 'INVALID_TOKEN');
        return;
    }
    console.log('Encrypting token...');
    // Encrypt the access token before storing
    const encryptedToken = encrypt(access_token);
    console.log('Token encrypted successfully');
    // Update user with encrypted GroupMe token
    console.log('Updating user in database...');
    const user = await User_1.default.findByIdAndUpdate(userId, {
        $set: {
            'groupMe.accessToken': encryptedToken,
            'groupMe.connectedAt': new Date(),
            'groupMe.email': groupMeUserData?.email || null,
            'groupMe.name': groupMeUserData?.name || null,
        },
    }, { new: true });
    if (!user) {
        console.error('User not found in database:', userId);
        (0, controllerUtils_1.sendError)(res, 404, 'User not found', null, 'USER_NOT_FOUND');
        return;
    }
    console.log('User updated successfully');
    // Don't initialize service instance here - let it be created per-request
    console.log('=== OAUTH CALLBACK COMPLETE ===');
    (0, controllerUtils_1.sendSuccess)(res, {
        message: 'GroupMe connected successfully',
        user: {
            id: user._id,
            groupMe: {
                connected: true,
                connectedAt: user.groupMe?.connectedAt,
                email: user.groupMe?.email,
                name: user.groupMe?.name,
            },
        },
    });
});
/**
 * Disconnect GroupMe (remove token)
 */
exports.disconnectGroupMe = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        (0, controllerUtils_1.sendError)(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
        return;
    }
    await User_1.default.findByIdAndUpdate(userId, {
        $unset: {
            'groupMe.accessToken': 1,
            'groupMe.connectedAt': 1,
            'groupMe.groups': 1,
        },
    });
    // Clear the service instance
    groupMeServiceInstance = null;
    (0, controllerUtils_1.sendSuccess)(res, { message: 'GroupMe disconnected successfully' });
});
/**
 * Get GroupMe connection status
 */
const getConnectionStatus = async (req, res) => {
    try {
        // Try to get user ID from different sources
        let userId;
        // First try authenticated user
        const authReq = req;
        if (authReq.user?.id) {
            userId = authReq.user.id;
        }
        // Otherwise, check if there's a session cookie or state parameter
        else if (req.cookies?.groupme_state) {
            try {
                const stateData = JSON.parse(Buffer.from(req.cookies.groupme_state, 'base64').toString());
                userId = stateData.userId;
            }
            catch (e) {
                console.log('Could not parse groupme_state cookie');
            }
        }
        // If no user ID found, return not connected
        if (!userId) {
            res.json({
                connected: false,
                connectedAt: null,
            });
            return;
        }
        const user = (await User_1.default.findById(userId)
            .select('groupMe.connectedAt groupMe.accessToken')
            .lean());
        if (!user) {
            res.json({ connected: false, connectedAt: null });
            return;
        }
        // If we have an encrypted accessToken, treat as connected even if legacy
        // documents never set connectedAt.
        const hasToken = !!user.groupMe?.accessToken;
        const connected = hasToken && (!!user.groupMe?.connectedAt || true);
        res.json({
            connected,
            connectedAt: user.groupMe?.connectedAt || null,
        });
    }
    catch (error) {
        console.error('Error getting connection status:', error);
        res.status(500).json({ error: 'Failed to get connection status' });
    }
};
exports.getConnectionStatus = getConnectionStatus;
/**
 * Initialize GroupMe configuration
 */
const initializeGroupMe = async (req, res) => {
    try {
        const token = process.env.GM_TOKEN;
        if (!token) {
            console.error('GM_TOKEN not found in environment variables');
            res.status(500).json({
                success: false,
                message: 'GM_TOKEN not found in environment variables',
            });
            return;
        }
        groupMeServiceInstance = new groupMeService_1.GroupMeService(token);
        await groupMeServiceInstance.initialize();
        // Set up event listeners
        groupMeServiceInstance.on('new-messages', (groupId, messages) => {
            // TODO: Emit to all connected clients when Socket.io is properly set up
            console.log(`New messages in group ${groupId}:`, messages.length);
        });
        groupMeServiceInstance.on('error', (error) => {
            console.error('GroupMe polling error:', error);
        });
        // Start polling for configured groups
        const groupIds = process.env.GM_GROUPS?.split(',') || [];
        if (groupIds.length > 0) {
            groupMeServiceInstance.startPolling(groupIds);
        }
        const groups = await GroupMeConfig_1.default.find();
        res.status(200).json({
            success: true,
            message: 'GroupMe configuration initialized',
            data: { groups },
        });
    }
    catch (error) {
        console.error('Error initializing GroupMe:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize GroupMe configuration',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.initializeGroupMe = initializeGroupMe;
/**
 * Get user's GroupMe service instance
 */
const getUserGroupMeService = async (userId) => {
    try {
        // Check cache first
        const cachedService = serviceInstances.get(userId);
        if (cachedService) {
            return cachedService;
        }
        const user = await User_1.default.findById(userId).select('groupMe.accessToken');
        if (!user?.groupMe?.accessToken) {
            return null;
        }
        // Decrypt the token – if decryption fails (e.g., token saved with a different key
        // or legacy plain-text token), fall back to the stored string as-is.
        let accessToken;
        try {
            accessToken = decrypt(user.groupMe.accessToken);
        }
        catch (decryptErr) {
            console.error(`Failed to decrypt GroupMe token for user ${userId}. Token will be treated as invalid.`, decryptErr);
            // If decryption fails, consider the user not connected so that the UI can prompt
            // them to reconnect and store a fresh token. Returning null prevents repeated
            // decryption attempts on every request.
            return null;
        }
        // Create new service instance for this user
        const service = new groupMeService_1.GroupMeService(accessToken);
        try {
            await service.initialize();
            // Cache the service instance
            serviceInstances.set(userId, service);
            // Set up cleanup after 30 minutes of inactivity
            setTimeout(() => {
                serviceInstances.delete(userId);
                service.stopPolling();
            }, 30 * 60 * 1000); // 30 minutes
            return service;
        }
        catch (initError) {
            console.error(`Failed to initialize GroupMe service for user ${userId}:`, initError);
            // If initialization fails, the token might be invalid
            return null;
        }
    }
    catch (error) {
        console.error('Error getting user GroupMe service:', error);
        return null;
    }
};
/**
 * Get all configured GroupMe groups
 */
exports.getGroups = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        (0, controllerUtils_1.sendError)(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
        return;
    }
    const service = await getUserGroupMeService(userId);
    if (!service) {
        (0, controllerUtils_1.sendError)(res, 401, 'GroupMe not connected. Please connect your GroupMe account.', null, 'NOT_CONNECTED');
        return;
    }
    const groups = await service.getGroups();
    (0, controllerUtils_1.sendSuccess)(res, groups);
});
/**
 * Get messages for a specific GroupMe group
 */
exports.getGroupMessages = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        (0, controllerUtils_1.sendError)(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
        return;
    }
    const service = await getUserGroupMeService(userId);
    if (!service) {
        (0, controllerUtils_1.sendError)(res, 401, 'GroupMe not connected. Please connect your GroupMe account.', null, 'NOT_CONNECTED');
        return;
    }
    const { groupId } = req.params;
    const { before_id, limit = '20' } = req.query;
    const messages = await service.getMessages(groupId, before_id, parseInt(limit));
    (0, controllerUtils_1.sendSuccess)(res, messages);
});
/**
 * Update a GroupMe group configuration
 */
exports.updateGroupConfig = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const { botId, botName, enabled, displayOrder, displayInDashboard } = req.body;
    const updatedConfig = await GroupMeConfig_1.default.findOneAndUpdate({ groupId }, {
        $set: {
            ...(botId !== undefined && { botId }),
            ...(botName !== undefined && { botName }),
            ...(enabled !== undefined && { enabled }),
            ...(displayOrder !== undefined && { displayOrder }),
            ...(displayInDashboard !== undefined && { displayInDashboard }),
            updatedAt: new Date(),
        },
    }, { new: true });
    if (!updatedConfig) {
        (0, controllerUtils_1.sendError)(res, 404, `GroupMe configuration for group ${groupId} not found`, null, 'NOT_FOUND');
        return;
    }
    // Update the bot mapping if service is initialized
    if (groupMeServiceInstance) {
        await groupMeService_1.default.updateBotMapping();
    }
    (0, controllerUtils_1.sendSuccess)(res, { config: updatedConfig }, 200, 'GroupMe configuration updated successfully');
});
/**
 * Send a message to a GroupMe group
 */
exports.sendMessage = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    // SAFETY CHECK: Log all message sends for audit trail
    console.warn('⚠️ GROUPME MESSAGE SEND REQUEST ⚠️');
    console.warn('User:', req.user?.id);
    console.warn('Group:', req.params.groupId);
    console.warn('Message:', req.body.text);
    console.warn('Time:', new Date().toISOString());
    const userId = req.user?.id;
    if (!userId) {
        (0, controllerUtils_1.sendError)(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
        return;
    }
    const service = await getUserGroupMeService(userId);
    if (!service) {
        (0, controllerUtils_1.sendError)(res, 401, 'GroupMe not connected. Please connect your GroupMe account.', null, 'NOT_CONNECTED');
        return;
    }
    const { groupId } = req.params;
    const { text, attachments } = req.body;
    if (!text && !attachments) {
        (0, controllerUtils_1.sendError)(res, 400, 'Message must have text or attachments', null, 'INVALID_REQUEST');
        return;
    }
    const message = await service.sendMessage(groupId, text || '', attachments);
    (0, controllerUtils_1.sendSuccess)(res, message);
});
/**
 * Get GroupMe configuration for the authenticated user
 */
const getConfig = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            console.error('SERVER LOG: getConfig - ERROR: No userId in req.user');
            return res.status(401).json({ message: 'User not authenticated for getConfig' });
        }
        console.log(`SERVER LOG: getConfig - Called for userId: ${userId}`);
        const config = await GroupMeConfig_1.default.findOne({ userId });
        if (!config) {
            console.log(`SERVER LOG: getConfig - No GroupMeConfig found for userId: ${userId}`);
            return res.status(200).json(null);
        }
        console.log(`SERVER LOG: getConfig - Found GroupMeConfig for userId: ${userId}, accessToken presence: ${!!config.accessToken}`);
        return res.status(200).json(config);
    }
    catch (error) {
        console.error('SERVER LOG: Error in getConfig:', error);
        return res.status(500).json({ message: 'Failed to get GroupMe configuration' });
    }
};
exports.getConfig = getConfig;
/**
 * Save GroupMe configuration for the authenticated user
 */
const saveConfig = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated for saveConfig' });
        }
        const { accessToken, groups } = req.body;
        if (!accessToken) {
            return res.status(400).json({ message: 'Access token is required for saveConfig' });
        }
        if (typeof groups !== 'object' || groups === null) {
            return res.status(400).json({ message: 'Groups must be a valid object.' });
        }
        // Encrypt token before storing in user profile as well
        const encryptedToken = encrypt(accessToken);
        // Save to GroupMeConfig collection
        const config = await GroupMeConfig_1.default.findOneAndUpdate({ userId }, { userId, accessToken, groups }, { upsert: true, new: true, runValidators: true });
        // Mirror token into User document so downstream code can decrypt & create service
        await User_1.default.findByIdAndUpdate(userId, {
            $set: {
                'groupMe.accessToken': encryptedToken,
                'groupMe.connectedAt': new Date(),
            },
        });
        return res.status(200).json(config);
    }
    catch (error) {
        console.error('SERVER LOG: Error saving GroupMe config:', error);
        if (error instanceof Error && error.name === 'ValidationError') {
            const validationError = error;
            return res.status(400).json({
                message: 'Validation failed for GroupMe config',
                errors: validationError.errors,
            });
        }
        if (error instanceof Error && error.message) {
            return res.status(500).json({
                message: 'Failed to save GroupMe configuration',
                error: error.message,
            });
        }
        return res.status(500).json({
            message: 'Failed to save GroupMe configuration',
            error: 'An unexpected error occurred',
        });
    }
};
exports.saveConfig = saveConfig;
/**
 * Handle webhook events from GroupMe
 */
const handleWebhook = async (req, res) => {
    try {
        console.log('SERVER LOG: GroupMe webhook received');
        const webhookData = req.body;
        res.status(200).send('OK');
        await groupMeService_1.default.processIncomingMessage(webhookData);
    }
    catch (error) {
        console.error('SERVER LOG: Error handling GroupMe webhook:', error);
    }
};
exports.handleWebhook = handleWebhook;
/**
 * Process incoming webhook message from GroupMe
 */
const processWebhookMessage = async (webhookData) => {
    try {
        if (webhookData.sender_type === 'bot') {
            return;
        }
        const message = new GroupMeMessage_1.default({
            groupId: webhookData.group_id,
            messageId: webhookData.id,
            text: webhookData.text,
            senderId: webhookData.sender_id,
            senderName: webhookData.name,
            avatarUrl: webhookData.avatar_url,
            createdAt: new Date(webhookData.created_at * 1000),
            attachments: webhookData.attachments || [],
        });
        await message.save();
    }
    catch (error) {
        console.error('Error processing GroupMe message:', error);
    }
};
