"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroups = exports.fetchGroupsFromGroupMeAPI = exports.getGroupMessages = exports.sendMessage = exports.processIncomingMessage = exports.updateBotMapping = exports.initializeGroupMeConfig = exports.GroupMeService = void 0;
const axios_1 = __importDefault(require("axios"));
const events_1 = require("events");
const GroupMeMessage_1 = __importDefault(require("../models/GroupMeMessage"));
const GroupMeConfig_1 = __importDefault(require("../models/GroupMeConfig"));
// Use the token from the provided callback URL setup
const DEFAULT_TOKEN = process.env.GROUPME_TOKEN || 'YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI';
const BASE_URL = 'https://api.groupme.com/v3';
// Bot ID mapping for the 6 group IDs (we'll load this from the database in real usage)
const GROUP_BOT_MAPPING = {};
class GroupMeService extends events_1.EventEmitter {
    constructor(token) {
        super();
        this.lastMessageIds = new Map();
        this.requestCount = 0;
        this.requestResetTime = Date.now() + 60000; // 1 minute from now
        // Validate token before using it
        if (!token) {
            console.error('No GroupMe token provided');
            throw new Error('No GroupMe token provided');
        }
        // Add better logging and token validation
        if (token === 'undefined') {
            console.error('GroupMe token is the string "undefined", which is invalid');
            throw new Error('Invalid GroupMe token: "undefined" string received');
        }
        // Log token characteristics for debugging
        console.log(`GroupMeService: Token validation - Length: ${token.length}, First 5 chars: ${token.substring(0, 5)}...`);
        this.token = token;
        this.api = axios_1.default.create({
            baseURL: 'https://api.groupme.com/v3',
            headers: {
                'X-Access-Token': token,
                'Content-Type': 'application/json'
            }
        });
        // Add response interceptor to detect API errors early
        this.api.interceptors.response.use((response) => response, (error) => {
            console.error('GroupMe API error:', {
                status: error.response?.status,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method
                }
            });
            return Promise.reject(error);
        });
        // Rate limiting interceptor
        this.api.interceptors.request.use(async (config) => {
            // Reset counter every minute
            if (Date.now() > this.requestResetTime) {
                this.requestCount = 0;
                this.requestResetTime = Date.now() + 60000;
            }
            // Check rate limit (100 requests per minute)
            if (this.requestCount >= 95) {
                // Leave some buffer
                const waitTime = this.requestResetTime - Date.now();
                if (waitTime > 0) {
                    console.log(`Rate limit approaching, waiting ${waitTime}ms`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                    this.requestCount = 0;
                    this.requestResetTime = Date.now() + 60000;
                }
            }
            this.requestCount++;
            return config;
        });
    }
    async initialize() {
        try {
            const user = await this.getCurrentUser();
            this.userId = user.id;
            console.log(`GroupMe initialized for user: ${user.name} (${user.id})`);
        }
        catch (error) {
            console.error('Failed to initialize GroupMe:', error);
            throw error;
        }
    }
    async getCurrentUser() {
        const response = await this.api.get('/users/me');
        return response.data.response;
    }
    async getGroups() {
        try {
            console.log('GroupMeService.getGroups: Making API request to GroupMe API');
            const response = await this.api.get('/groups', {
                params: {
                    per_page: 50 // Request maximum number of groups
                }
            });
            console.log('GroupMeService.getGroups: Received response from GroupMe API');
            if (!response.data || !response.data.response) {
                console.error('GroupMeService.getGroups: Invalid response format', response.data);
                return [];
            }
            const groups = response.data.response;
            console.log(`GroupMeService.getGroups: Found ${groups.length} groups`);
            // Map the raw API response to our GroupMeGroup format
            return groups.map((group) => ({
                id: group.id,
                name: group.name,
                image_url: group.image_url,
                messages: group.messages,
                members_count: group.members ? group.members.length : 0
            }));
        }
        catch (error) {
            console.error('GroupMeService.getGroups: Error fetching groups from GroupMe API', error);
            throw error; // Re-throw to let the controller handle it
        }
    }
    async getGroup(groupId) {
        const response = await this.api.get(`/groups/${groupId}`);
        return response.data.response;
    }
    async getMessages(groupId, beforeId, limit = 20) {
        const params = { limit };
        if (beforeId)
            params.before_id = beforeId;
        const response = await this.api.get(`/groups/${groupId}/messages`, { params });
        return response.data.response.messages;
    }
    async sendMessage(groupId, text, attachments) {
        const message = {
            message: {
                source_guid: Date.now().toString(),
                text,
                attachments: attachments || [],
            },
        };
        const response = await this.api.post(`/groups/${groupId}/messages`, message);
        return response.data.response.message;
    }
    async getMembers(groupId) {
        const response = await this.api.get(`/groups/${groupId}`);
        return response.data.response.members;
    }
    async getDirectMessages(otherUserId, beforeId) {
        const params = { other_user_id: otherUserId };
        if (beforeId)
            params.before_id = beforeId;
        const response = await this.api.get('/direct_messages', { params });
        return response.data.response.direct_messages;
    }
    async sendDirectMessage(otherUserId, text, attachments) {
        const message = {
            direct_message: {
                source_guid: Date.now().toString(),
                recipient_id: otherUserId,
                text,
                attachments: attachments || [],
            },
        };
        const response = await this.api.post('/direct_messages', message);
        return response.data.response.direct_message;
    }
    async uploadImage(imageData, contentType) {
        // First get upload URL from GroupMe
        const response = await this.api.post('/pictures', null, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': imageData.length,
            },
        });
        const { url, picture_url } = response.data.payload;
        // Upload image to S3
        await axios_1.default.post(url, imageData, {
            headers: {
                'Content-Type': contentType,
            },
        });
        return picture_url;
    }
    startPolling(groupIds, interval = 2000) {
        this.stopPolling(); // Stop any existing polling
        console.log(`Starting GroupMe polling for ${groupIds.length} groups`);
        this.pollingInterval = setInterval(async () => {
            try {
                for (const groupId of groupIds) {
                    const messages = await this.getMessages(groupId, undefined, 5);
                    if (messages.length > 0) {
                        const latestMessageId = messages[0].id;
                        const lastKnownId = this.lastMessageIds.get(groupId);
                        if (!lastKnownId) {
                            // First poll, just store the latest ID
                            this.lastMessageIds.set(groupId, latestMessageId);
                        }
                        else if (latestMessageId !== lastKnownId) {
                            // New messages detected
                            const newMessages = [];
                            for (const message of messages) {
                                if (message.id === lastKnownId)
                                    break;
                                newMessages.push(message);
                            }
                            if (newMessages.length > 0) {
                                this.emit('new-messages', groupId, newMessages.reverse());
                                this.lastMessageIds.set(groupId, latestMessageId);
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error('Polling error:', error);
                this.emit('error', error);
            }
        }, interval);
    }
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = undefined;
            console.log('GroupMe polling stopped');
        }
    }
    // Get recent conversations (for DM list)
    async getConversations() {
        const response = await this.api.get('/chats');
        return response.data.response;
    }
    // Like a message
    async likeMessage(groupId, messageId) {
        await this.api.post(`/messages/${groupId}/${messageId}/like`);
    }
    // Unlike a message
    async unlikeMessage(groupId, messageId) {
        await this.api.post(`/messages/${groupId}/${messageId}/unlike`);
    }
}
exports.GroupMeService = GroupMeService;
/**
 * Initialize the GroupMe configuration with the provided groups and bot IDs
 */
const initializeGroupMeConfig = async () => {
    try {
        // This function needs a significant rewrite to be user-centric.
        // For now, ensuring it doesn't crash the server on startup.
        console.log('initializeGroupMeConfig called - currently a placeholder due to model changes.');
        await (0, exports.updateBotMapping)();
    }
    catch (error) {
        console.error('Error in stubbed initializeGroupMeConfig:', error);
    }
};
exports.initializeGroupMeConfig = initializeGroupMeConfig;
/**
 * Update the local mapping of group IDs to bot IDs
 */
const updateBotMapping = async () => {
    try {
        // This function also needs a rewrite for the user-centric IGroupMeConfig.
        // It would need to iterate all users' configs or a specific one.
        console.log('updateBotMapping called - currently a placeholder. Bot mapping:', GROUP_BOT_MAPPING);
    }
    catch (error) {
        console.error('Error in stubbed updateBotMapping:', error);
    }
};
exports.updateBotMapping = updateBotMapping;
/**
 * Process an incoming message from GroupMe
 */
const processIncomingMessage = async (messageData) => {
    try {
        if (!messageData || !messageData.group_id || messageData.sender_type === 'bot') {
            return;
        }
        const existingMessage = await GroupMeMessage_1.default.findOne({
            messageId: messageData.id,
        });
        if (existingMessage)
            return;
        // Find a user config that contains this group_id to get the groupName
        // This is a simplified lookup and might not be efficient for many users.
        const groupConfigOwningUser = await GroupMeConfig_1.default.findOne({
            [`groups.${messageData.group_id}`]: { $exists: true },
        });
        const groupName = groupConfigOwningUser?.groups?.[messageData.group_id] || 'Unknown Group';
        await GroupMeMessage_1.default.create({
            messageId: messageData.id,
            groupId: messageData.group_id,
            groupName: groupName, // Use resolved groupName
            senderId: messageData.user_id,
            senderName: messageData.name,
            avatarUrl: messageData.avatar_url,
            text: messageData.text || '',
            attachments: messageData.attachments || [],
            createdAt: new Date(messageData.created_at * 1000),
            system: messageData.system || false,
            processed: true,
        });
        console.log(`Processed GroupMe message ${messageData.id} from ${messageData.name} in group ${messageData.group_id} (${groupName})`);
    }
    catch (error) {
        console.error('Error processing GroupMe message:', error);
    }
};
exports.processIncomingMessage = processIncomingMessage;
/**
 * Send a message to a GroupMe group
 */
const sendMessage = async (groupId, text, attachments) => {
    try {
        // This would also need to be user-specific in a multi-user bot scenario
        const botId = GROUP_BOT_MAPPING[groupId];
        if (!botId) {
            // console.warn(`No bot ID found for group ${groupId}. Message not sent.`);
            // throw new Error(`No bot ID found for group ${groupId}. Cannot send message.`);
            // For now, let it fail silently or log, as bot creation/mapping is complex here.
            console.warn(`sendMessage: No bot_id for groupId ${groupId}. Bot mapping needs to be populated.`);
            return { message: 'No bot_id configured for this group.' };
        }
        const response = await axios_1.default.post(`${BASE_URL}/bots/post`, {
            bot_id: botId,
            text,
            attachments,
        });
        return response.data;
    }
    catch (error) {
        console.error(`Error sending message to GroupMe group ${groupId}:`, error);
        throw error;
    }
};
exports.sendMessage = sendMessage;
/**
 * Get recent messages for a group using a provided access token
 */
const getGroupMessages = async (accessToken, groupId, limit = 20, beforeId) => {
    try {
        if (!accessToken) {
            console.warn(`GROUPME_SERVICE: No accessToken provided for getGroupMessages for group ${groupId}`);
            return []; // Or throw error
        }
        // The GroupMe API for messages for a specific group does not require a separate userId if you have the group_id and user's accessToken.
        // The token itself implies the user context for that group.
        const params = {
            token: accessToken,
            limit,
            // Add timestamp to avoid caching
            timestamp: Date.now(),
        };
        if (beforeId)
            params.before_id = beforeId;
        console.log(`GROUPME_SERVICE: Fetching messages for group ${groupId} with limit ${limit}` +
            (beforeId ? ` before ${beforeId}` : ''));
        const response = await axios_1.default.get(`${BASE_URL}/groups/${groupId}/messages`, {
            params,
        });
        const apiMessages = response.data.response?.messages || [];
        console.log(`GROUPME_SERVICE: Received ${apiMessages.length} messages for group ${groupId}`);
        // If we have messages, log the newest one's timestamp for debugging
        if (apiMessages.length > 0) {
            const newestMessage = apiMessages[0]; // GroupMe returns newest first
            console.log(`GROUPME_SERVICE: Newest message for group ${groupId} is from ${new Date(newestMessage.created_at * 1000).toLocaleString()}: "${newestMessage.text?.substring(0, 30)}..."`);
        }
        return apiMessages;
    }
    catch (error) {
        if (error.response) {
            console.error(`GROUPME_SERVICE: Error getting messages for group ${groupId} - Status ${error.response.status}:`, error.response.data);
        }
        else {
            console.error(`GROUPME_SERVICE: Error getting messages for group ${groupId}:`, error.message);
        }
        return []; // Return empty or throw, depending on desired error handling
    }
};
exports.getGroupMessages = getGroupMessages;
/**
 * Fetch groups directly from GroupMe API
 */
const fetchGroupsFromGroupMeAPI = async (accessToken) => {
    try {
        console.log('Fetching groups directly from GroupMe API with token');
        const response = await axios_1.default.get(`${BASE_URL}/groups`, {
            params: {
                token: accessToken,
                per_page: 50, // GroupMe's max per_page limit
            },
        });
        if (response.data && response.data.response && Array.isArray(response.data.response)) {
            const groups = response.data.response.map((g, index) => ({
                groupId: g.id || g.group_id || '',
                groupName: g.name || '',
                botId: g.bot_id || '',
                enabled: true,
                displayOrder: index,
                displayInDashboard: true,
            }));
            console.log(`Found ${groups.length} groups from GroupMe API`);
            return groups;
        }
        console.log('No groups found in GroupMe API response');
        return [];
    }
    catch (error) {
        console.error('Error fetching groups from GroupMe API:', error);
        return [];
    }
};
exports.fetchGroupsFromGroupMeAPI = fetchGroupsFromGroupMeAPI;
/**
 * Get all available groups
 */
const getGroups = async (userId) => {
    try {
        const userConfig = await GroupMeConfig_1.default.findOne({ userId });
        if (!userConfig || !userConfig.groups) {
            return [];
        }
        // Convert from Record<string, string> to GroupMeGroup[]
        const groups = Object.entries(userConfig.groups).map(([id, name], index) => ({
            groupId: id,
            groupName: name,
            botId: '', // We might not have this info from the config
            enabled: true,
            displayOrder: index,
            displayInDashboard: true,
        }));
        return groups;
    }
    catch (error) {
        console.error(`Error getting groups for user ${userId}:`, error);
        return [];
    }
};
exports.getGroups = getGroups;
exports.default = {
    initializeGroupMeConfig: exports.initializeGroupMeConfig,
    processIncomingMessage: exports.processIncomingMessage,
    sendMessage: exports.sendMessage,
    getGroupMessages: exports.getGroupMessages,
    getGroups: exports.getGroups,
    updateBotMapping: exports.updateBotMapping,
    fetchGroupsFromGroupMeAPI: exports.fetchGroupsFromGroupMeAPI,
};
