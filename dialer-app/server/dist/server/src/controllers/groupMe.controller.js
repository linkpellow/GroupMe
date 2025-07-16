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
exports.handleGroupMeImplicitCallback = exports.saveGroupMeToken = exports.handleWebhook = exports.saveConfig = exports.getConfig = exports.sendMessage = exports.updateGroupConfig = exports.getGroupMessages = exports.getGroups = exports.getUserGroupMeService = exports.initializeGroupMe = exports.getConnectionStatus = exports.disconnectGroupMe = exports.saveManualToken = exports.handleOAuthCallback = exports.initiateOAuth = void 0;
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
const GROUPME_REDIRECT_URI = process.env.GROUPME_REDIRECT_URI ||
    (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/groupme/callback` : 'http://localhost:5173/groupme/callback');
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
    // Per GroupMe documentation, the OAuth URL format is very simple:
    // https://dev.groupme.com/tutorials/oauth
    const authUrl = `https://oauth.groupme.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
    console.log('Initiating OAuth with URL:', authUrl);
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
    const { code, state } = req.body;
    console.log('Code received:', code ? 'Yes' : 'No');
    console.log('Code length:', code?.length);
    console.log('Code first 20 chars:', code?.substring(0, 20));
    console.log('State received:', state);
    if (!code || !state) {
        console.error('Missing code or state');
        (0, controllerUtils_1.sendError)(res, 400, 'Missing code or state', null, 'INVALID_REQUEST');
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
    // Check if user is already connected
    try {
        const user = await User_1.default.findById(userId).select('groupMe.accessToken');
        if (user?.groupMe?.accessToken) {
            console.warn('User already connected to GroupMe:', userId);
            (0, controllerUtils_1.sendError)(res, 409, 'User already connected to GroupMe', null, 'ALREADY_CONNECTED');
            return;
        }
    }
    catch (err) {
        console.error('Error checking existing GroupMe connection:', err);
        (0, controllerUtils_1.sendError)(res, 500, 'Failed to check connection', null, 'CONNECTION_CHECK_ERROR');
        return;
    }
    // Exchange code for access token via undocumented endpoint
    console.log('=== EXCHANGING CODE FOR ACCESS TOKEN ===');
    let accessToken = '';
    try {
        const axios = require('axios');
        const CLIENT_ID = process.env.GROUPME_CLIENT_ID;
        const CLIENT_SECRET = process.env.GROUPME_CLIENT_SECRET;
        console.log('Posting to https://api.groupme.com/oauth/access_token');
        let tokenResp;
        try {
            // Per 2025 docs, only client_id and code are required (no secret, no grant_type)
            tokenResp = await axios.post('https://api.groupme.com/oauth/access_token', {
                client_id: CLIENT_ID,
                code,
            });
        }
        catch (err) {
            console.error('Token exchange failed', err.response?.status, err.response?.data || err.message);
            (0, controllerUtils_1.sendError)(res, 502, 'Token exchange failed', null, 'TOKEN_EXCHANGE_FAILED');
            return;
        }
        if (!tokenResp.data || !tokenResp.data.access_token) {
            console.error('No access_token in GroupMe response', tokenResp.data);
            (0, controllerUtils_1.sendError)(res, 500, 'Failed to obtain GroupMe token', null, 'TOKEN_EXCHANGE_ERROR');
            return;
        }
        accessToken = tokenResp.data.access_token;
        // Validate the token with GroupMe API
        console.log('Validating token with GroupMe API...');
        const validationResponse = await axios.get('https://api.groupme.com/v3/users/me', {
            headers: {
                'X-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout
        });
        console.log('Token validation successful!');
        console.log('GroupMe user:', validationResponse.data.response);
        const groupMeUserData = validationResponse.data.response;
        // Encrypt the access token before storing
        console.log('Encrypting token...');
        const encryptedToken = encrypt(accessToken);
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
        console.log('=== OAUTH CALLBACK COMPLETE ===');
        // Also persist token in GroupMeConfig so front-end can pick it up via /config API
        await GroupMeConfig_1.default.findOneAndUpdate({ userId }, { userId, accessToken: encryptedToken }, { upsert: true, new: true });
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
            // Encrypt and save the token anyway
            const encryptedToken = encrypt(accessToken);
            const user = await User_1.default.findByIdAndUpdate(userId, {
                $set: {
                    'groupMe.accessToken': encryptedToken,
                    'groupMe.connectedAt': new Date(),
                },
            }, { new: true });
            if (!user) {
                console.error('User not found in database:', userId);
                (0, controllerUtils_1.sendError)(res, 404, 'User not found', null, 'USER_NOT_FOUND');
                return;
            }
            (0, controllerUtils_1.sendSuccess)(res, {
                message: 'GroupMe connected successfully (token saved but not validated)',
                user: {
                    id: user._id,
                    groupMe: {
                        connected: true,
                        connectedAt: user.groupMe?.connectedAt,
                    },
                },
            });
            return;
        }
        console.error('Unexpected error from GroupMe:', validationError.message);
        (0, controllerUtils_1.sendError)(res, 500, 'Failed to validate GroupMe token', null, 'VALIDATION_ERROR');
    }
    // Debug: log critical GroupMe env vars (non-production) so we can spot mis-config quickly
    if (process.env.NODE_ENV !== 'production') {
        console.log('GroupMe ENV', {
            client_id: process.env.GROUPME_CLIENT_ID,
            redirect_uri: process.env.GROUPME_REDIRECT_URI,
            secret_present: !!process.env.GROUPME_CLIENT_SECRET,
        });
    }
});
/**
 * Save manually entered GroupMe token
 */
exports.saveManualToken = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        (0, controllerUtils_1.sendError)(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
        return;
    }
    if (!token) {
        (0, controllerUtils_1.sendError)(res, 400, 'Token is required', null, 'INVALID_REQUEST');
        return;
    }
    // Encrypt and save the token
    const encryptedToken = encrypt(token);
    await User_1.default.findByIdAndUpdate(userId, {
        $set: {
            'groupMe.accessToken': encryptedToken,
            'groupMe.connectedAt': new Date(),
        },
    });
    (0, controllerUtils_1.sendSuccess)(res, { message: 'Token saved successfully' });
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
 * Helper to get or create a GroupMe service for a user
 */
const getUserGroupMeService = async (userId) => {
    console.log(`🔍 getUserGroupMeService: Creating GroupMe service for user ${userId}`);
    // Check if we already have a service instance for this user
    if (serviceInstances.has(userId)) {
        console.log(`✅ getUserGroupMeService: Using cached service instance for ${userId}`);
        return serviceInstances.get(userId);
    }
    try {
        // Get the user document with the encrypted GroupMe token
        const user = await User_1.default.findById(userId).select('groupMe');
        if (!user) {
            console.error(`❌ getUserGroupMeService: User ${userId} not found`);
            return null;
        }
        if (!user.groupMe?.accessToken) {
            console.error(`❌ getUserGroupMeService: User ${userId} has no GroupMe access token`);
            return null;
        }
        console.log(`✅ getUserGroupMeService: Found encrypted GroupMe token for user ${userId}`);
        // Decrypt the token
        try {
            const decryptedToken = decrypt(user.groupMe.accessToken);
            console.log(`✅ getUserGroupMeService: Successfully decrypted token`);
            // Create a new service instance
            const service = new groupMeService_1.GroupMeService(decryptedToken);
            console.log(`✅ getUserGroupMeService: Created new service instance for ${userId}`);
            // Initialize the service
            await service.initialize();
            console.log(`✅ getUserGroupMeService: Service initialized for ${userId}`);
            // Cache the service instance
            serviceInstances.set(userId, service);
            return service;
        }
        catch (decryptError) {
            console.error(`❌ getUserGroupMeService: Failed to decrypt token for ${userId}:`, decryptError);
            return null;
        }
    }
    catch (error) {
        console.error(`❌ getUserGroupMeService: Error creating GroupMe service for ${userId}:`, error);
        return null;
    }
};
exports.getUserGroupMeService = getUserGroupMeService;
/**
 * Get all configured GroupMe groups
 */
exports.getGroups = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        (0, controllerUtils_1.sendError)(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
        return;
    }
    const service = await (0, exports.getUserGroupMeService)(userId);
    if (!service) {
        (0, controllerUtils_1.sendError)(res, 401, 'GroupMe not connected. Please connect your GroupMe account.', null, 'NOT_CONNECTED');
        return;
    }
    try {
        console.log('Fetching groups for user:', userId);
        // Use any type for the raw API response since it doesn't match our interface
        const apiGroups = await service.getGroups();
        console.log(`Retrieved ${apiGroups.length} groups from GroupMe API`);
        console.log('Raw API response structure:', JSON.stringify(apiGroups.slice(0, 1), null, 2));
        // If we got groups from the API, save them to the user's GroupMe config
        if (apiGroups.length > 0) {
            const user = await User_1.default.findById(userId);
            if (user && user.groupMe && user.groupMe.accessToken) {
                // Store the groups in the user's config for future use
                const groupsMap = {};
                apiGroups.forEach(group => {
                    // The raw API response has id and name properties
                    if (group.id && group.name) {
                        groupsMap[group.id] = group.name;
                    }
                });
                // Update or create GroupMe config
                await GroupMeConfig_1.default.findOneAndUpdate({ userId }, { userId, groups: groupsMap }, { upsert: true, new: true });
                console.log(`Saved ${Object.keys(groupsMap).length} groups to user's config`);
            }
        }
        // Format the groups to match the expected structure in the frontend
        const formattedGroups = apiGroups.map(group => {
            // Check if we need to handle the GroupMeService.getGroups format or the raw API format
            const formattedGroup = {
                groupId: group.id || group.groupId,
                groupName: group.name || group.groupName,
                image_url: group.image_url,
                last_message: group.messages?.preview,
                messages_count: group.messages?.count,
                members_count: group.members_count
            };
            console.log('Formatted group:', formattedGroup);
            return formattedGroup;
        });
        console.log(`Returning ${formattedGroups.length} formatted groups to client`);
        (0, controllerUtils_1.sendSuccess)(res, formattedGroups);
    }
    catch (error) {
        console.error('Error fetching groups from GroupMe API:', error);
        (0, controllerUtils_1.sendError)(res, 500, 'Failed to fetch groups', null, 'API_ERROR');
    }
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
    const service = await (0, exports.getUserGroupMeService)(userId);
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
    const service = await (0, exports.getUserGroupMeService)(userId);
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
            return res.status(401).json({
                error: 'User not authenticated for getConfig',
                code: 'AUTHENTICATION_REQUIRED'
            });
        }
        // Log the authentication details for debugging
        console.log(`SERVER LOG: getConfig - Called for userId: ${userId}`);
        console.log(`SERVER LOG: getConfig - Auth header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
        const config = await GroupMeConfig_1.default.findOne({ userId });
        if (!config) {
            console.log(`SERVER LOG: getConfig - No GroupMeConfig found for userId: ${userId}`);
            // Return 200 with null data instead of 404 to avoid triggering auth errors
            return res.status(200).json(null);
        }
        console.log(`SERVER LOG: getConfig - Found GroupMeConfig for userId: ${userId}, accessToken presence: ${!!config.accessToken}`);
        return res.status(200).json(config);
    }
    catch (error) {
        console.error('SERVER LOG: Error in getConfig:', error);
        return res.status(500).json({
            message: 'Failed to get GroupMe configuration',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
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
        return res;
    }
    catch (error) {
        console.error('SERVER LOG: Error handling GroupMe webhook:', error);
        return res;
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
/**
 * Save GroupMe access token from OAuth callback
 */
exports.saveGroupMeToken = (0, controllerUtils_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { access_token } = req.body;
    console.log('=== SAVE GROUPME TOKEN DEBUG ===');
    console.log('User ID:', userId);
    console.log('Access token present:', !!access_token);
    if (!userId) {
        console.error('No userId in request when saving GroupMe token');
        return res.status(401).json({ error: 'User authentication required' });
    }
    if (!access_token) {
        console.error('No access_token provided when saving GroupMe token');
        return res.status(400).json({ error: 'Access token is required' });
    }
    if (access_token === 'undefined') {
        console.error('Access token is string "undefined" - invalid token');
        return res.status(400).json({ error: 'Invalid access token: "undefined" string received' });
    }
    try {
        console.log(`Saving GroupMe token for user ${userId} - token length: ${access_token.length}`);
        // Validate the token with a quick GroupMe API call
        try {
            const axios = require('axios');
            const validateResponse = await axios.get('https://api.groupme.com/v3/users/me', {
                headers: { 'X-Access-Token': access_token }
            });
            if (validateResponse.data && validateResponse.data.response) {
                console.log('GroupMe token validation successful - user:', validateResponse.data.response.name);
            }
            else {
                console.warn('GroupMe token validation returned unexpected response format');
            }
        }
        catch (validationError) {
            console.warn('GroupMe token validation failed, but continuing with save:', validationError.message);
        }
        // Encrypt the token
        const encryptedToken = encrypt(access_token);
        // Save to User
        await User_1.default.findByIdAndUpdate(userId, {
            $set: {
                'groupMe.accessToken': encryptedToken,
                'groupMe.connectedAt': new Date()
            }
        });
        // Save to GroupMeConfig
        await GroupMeConfig_1.default.findOneAndUpdate({ userId }, {
            userId,
            accessToken: encryptedToken
        }, { upsert: true, new: true });
        console.log(`GroupMe token successfully saved for user ${userId}`);
        return res.sendStatus(204);
    }
    catch (error) {
        console.error('Error saving GroupMe token:', error);
        return res.status(500).json({
            error: 'Failed to save GroupMe token',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// ... add new handler for GET /groupme/callback (implicit grant)
const handleGroupMeImplicitCallback = async (req, res) => {
    console.log('=== GROUPME CALLBACK DEBUG ===');
    console.log('Request query:', req.query);
    console.log('Request cookies:', req.cookies);
    console.log('Request URL:', req.url);
    console.log('Request path:', req.path);
    // Per GroupMe docs, the token comes in query parameters for implicit flow
    const { access_token, state } = req.query;
    console.log('Received access_token:', access_token ? `${access_token.substring(0, 5)}... (length: ${access_token.length})` : 'none');
    if (!state) {
        console.error('GroupMe callback missing state', req.query);
        res.status(400).send('Invalid GroupMe callback: Missing state parameter');
        return;
    }
    if (!access_token) {
        console.error('GroupMe callback missing access_token', req.query);
        res.status(400).send('Invalid GroupMe callback: Missing access_token parameter');
        return;
    }
    // Decode userId from state
    let userId;
    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
        if (!userId) {
            console.error('No userId in state data', stateData);
            res.status(400).send('Invalid state parameter: Missing userId');
            return;
        }
        console.log('Successfully decoded state with userId:', userId);
    }
    catch (err) {
        console.error('Failed to decode state:', err);
        res.status(400).send('Invalid state parameter: Could not decode');
        return;
    }
    // Now save this token to the user's account
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            console.error(`User ${userId} not found`);
            res.status(404).send('User not found');
            return;
        }
        // Encrypt token before saving
        const encryptedToken = encrypt(access_token);
        // Set the token in user's groupMe field
        user.groupMe = {
            accessToken: encryptedToken,
            connectedAt: new Date(),
        };
        // Save the user with the updated groupMe field
        await user.save();
        // Also save to GroupMeConfig for the frontend
        await GroupMeConfig_1.default.findOneAndUpdate({ userId }, {
            userId,
            accessToken: encryptedToken
        }, { upsert: true, new: true });
        console.log(`GroupMe token saved successfully for user ${userId}`);
        // Return success page
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GroupMe Connected</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #2C2F33;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          .card {
            background-color: #36393F;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
          }
          h1 {
            color: #43B581;
            margin-top: 0;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .message {
            margin-bottom: 20px;
          }
          button {
            background-color: #43B581;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }
          button:hover {
            background-color: #3ca374;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>GroupMe Connected!</h1>
          <p class="message">Your GroupMe account has been successfully connected.</p>
          <button onclick="window.close()">Close Window</button>
          <script>
            // Notify the opener window about successful connection
            if (window.opener) {
              try {
                window.opener.postMessage({
                  type: 'GROUPME_CONNECTED',
                  success: true,
                  timestamp: Date.now()
                }, '*');
                console.log('Success message sent to parent window');
                
                // Close this window after a short delay
                setTimeout(() => {
                  window.close();
                }, 2000);
              } catch (e) {
                console.log('Error sending message to parent: ' + e.message);
              }
            }
          </script>
        </div>
      </body>
      </html>
    `);
    }
    catch (saveError) {
        console.error('Failed to save GroupMe token:', saveError.message);
        res.status(500).send('Failed to save GroupMe token: ' + saveError.message);
    }
};
exports.handleGroupMeImplicitCallback = handleGroupMeImplicitCallback;
