import { Request, Response } from 'express';
import GroupMeConfig from '../models/GroupMeConfig';
import GroupMeMessage from '../models/GroupMeMessage';
import groupMeService, { GroupMeService, GroupMeGroup } from '../services/groupMeService';
import crypto from 'crypto';
import User, { IUser } from '../models/User';
import { sendError, sendSuccess, asyncHandler, logRequest } from '../utils/controllerUtils';
import { getEncryptionKey } from '../utils/secret';

// Extend Express Request type to include 'user'
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    groupMe?: {
      accessToken?: string;
      groups?: Record<string, string>;
    };
    [key: string]: any;
  };
}

let groupMeServiceInstance: GroupMeService | null = null;

// OAuth Configuration
const GROUPME_CLIENT_ID = process.env.GROUPME_CLIENT_ID || 'YOUR_CLIENT_ID';
const GROUPME_REDIRECT_URI =
  process.env.GROUPME_REDIRECT_URI ||
  (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/groupme/callback` : 'http://localhost:5173/groupme/callback');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Encryption helpers
const ENCRYPTION_KEY = getEncryptionKey();
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Attempt to decrypt using NEW_KEY (sha256 hash of JWT_SECRET). If that fails, try
 * legacy OLD_KEY (first 32 chars of JWT_SECRET). If both fail, re-throw so callers
 * can decide what to do (e.g., fall back to plaintext token).
 */
function decrypt(encryptedText: string): string {
  // If the stored value doesn't look like our iv:cipherText format, assume it's plain text
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }
  const [ivHex, dataHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedData = Buffer.from(dataHex, 'hex');

  const tryDecrypt = (key: Buffer) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  };

  // Attempt decryption with both key versions; if all attempts fail, treat value as plaintext
  try {
    // First try the current key (SHA256)
    return tryDecrypt(ENCRYPTION_KEY);
  } catch (err) {
    try {
      // Fallback to legacy key derived from substring
      const legacyKey = Buffer.from((process.env.JWT_SECRET || '').substring(0, 32));
      return tryDecrypt(legacyKey);
    } catch (_legacyErr) {
      // Final fallback ‑ assume the stored value is plaintext (unencrypted token)
      console.warn('decrypt() failed with both keys ‑ returning original value as plaintext');
      return encryptedText;
    }
  }
}

// Service instance cache - store per userId
const serviceInstances = new Map<string, GroupMeService>();

/**
 * Initiate OAuth flow for GroupMe
 */
export const initiateOAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const CLIENT_ID = process.env.GROUPME_CLIENT_ID;
  const REDIRECT_URI = process.env.GROUPME_REDIRECT_URI || 'http://localhost:5173/groupme/callback';

  if (!CLIENT_ID) {
    sendError(res, 500, 'GroupMe client ID not configured', null, 'CONFIG_ERROR');
    return;
  }

  let userId: string;

  // Get userId from request body or query params (sent from frontend)
  userId = req.body.userId || (req.query.userId as string);

  if (!userId) {
    sendError(res, 400, 'User ID is required', null, 'MISSING_USER_ID');
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

  // Use authorization-code flow. GroupMe uses /oauth/login_dialog endpoint which returns ?code=…
  const authUrl = `https://oauth.groupme.com/oauth/login_dialog?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&state=${state}`;

  sendSuccess(res, { authUrl, state });
});

/**
 * Handle OAuth callback and save token
 */
export const handleOAuthCallback = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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
      sendError(res, 400, 'Missing code or state', null, 'INVALID_REQUEST');
      return;
    }

    // Decode and verify state
    let stateData: any;
    try {
      console.log('Decoding state parameter...');
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      console.log('State decoded successfully:', stateData);
      console.log('State age (ms):', Date.now() - stateData.timestamp);
    } catch (error) {
      console.error('Failed to decode state:', error);
      sendError(res, 400, 'Invalid state parameter', null, 'INVALID_STATE');
      return;
    }

    const { userId } = stateData;

    if (!userId) {
      console.error('No userId in state data');
      sendError(res, 400, 'User ID not found in state', null, 'INVALID_STATE');
      return;
    }

    console.log('UserId from state:', userId);

    // Exchange code for access token via undocumented endpoint
    console.log('=== EXCHANGING CODE FOR ACCESS TOKEN ===');
    let accessToken = '';

    try {
      const axios = require('axios');
      const CLIENT_ID = process.env.GROUPME_CLIENT_ID;
      const CLIENT_SECRET = process.env.GROUPME_CLIENT_SECRET;

      if (!CLIENT_SECRET) {
        console.error('GROUPME_CLIENT_SECRET env var is missing');
        sendError(res, 500, 'GroupMe client secret not configured', null, 'CONFIG_ERROR');
        return;
      }

      console.log('Posting to https://api.groupme.com/oauth/access_token');
      const tokenResp = await axios.post('https://api.groupme.com/oauth/access_token', {
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      });

      if (!tokenResp.data || !tokenResp.data.access_token) {
        console.error('No access_token in GroupMe response', tokenResp.data);
        sendError(res, 500, 'Failed to obtain GroupMe token', null, 'TOKEN_EXCHANGE_ERROR');
        return;
      }

      accessToken = tokenResp.data.access_token as string;
      
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
      const user = await User.findByIdAndUpdate<IUser>(
        userId,
        {
          $set: {
            'groupMe.accessToken': encryptedToken,
            'groupMe.connectedAt': new Date(),
            'groupMe.email': groupMeUserData?.email || null,
            'groupMe.name': groupMeUserData?.name || null,
          },
        },
        { new: true }
      );

      if (!user) {
        console.error('User not found in database:', userId);
        sendError(res, 404, 'User not found', null, 'USER_NOT_FOUND');
        return;
      }

      console.log('User updated successfully');
      console.log('=== OAUTH CALLBACK COMPLETE ===');
      // Also persist token in GroupMeConfig so front-end can pick it up via /config API
      await GroupMeConfig.findOneAndUpdate(
        { userId },
        { userId, accessToken: encryptedToken },
        { upsert: true, new: true }
      );
      sendSuccess(res, {
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
      
    } catch (validationError: any) {
      console.error('=== TOKEN VALIDATION RESPONSE ===');
      console.error('Status:', validationError.response?.status);
      console.error('Status text:', validationError.response?.statusText);
      console.error('Error data:', validationError.response?.data);

      // Check if it's a network error vs auth error
      if (!validationError.response) {
        console.error('Network error - could not reach GroupMe API');
        sendError(
          res,
          500,
          'Could not reach GroupMe servers. Please try again.',
          null,
          'NETWORK_ERROR'
        );
        return;
      }

      // GroupMe sometimes returns 401 for valid new tokens
      // We'll proceed with saving the token and let the user test it
      if (validationError.response?.status === 401 || validationError.response?.status === 403) {
        console.warn('GroupMe returned 401/403 - this is common for new tokens');
        console.warn('Proceeding with token storage - user can test connection after');
        
        // Encrypt and save the token anyway
        const encryptedToken = encrypt(accessToken);
        
        const user = await User.findByIdAndUpdate<IUser>(
          userId,
          {
            $set: {
              'groupMe.accessToken': encryptedToken,
              'groupMe.connectedAt': new Date(),
            },
          },
          { new: true }
        );

        if (!user) {
          console.error('User not found in database:', userId);
          sendError(res, 404, 'User not found', null, 'USER_NOT_FOUND');
          return;
        }
        
        sendSuccess(res, {
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
      sendError(res, 500, 'Failed to validate GroupMe token', null, 'VALIDATION_ERROR');
    }
  }
);

/**
 * Save manually entered GroupMe token
 */
export const saveManualToken = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      sendError(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
      return;
    }

    if (!token) {
      sendError(res, 400, 'Token is required', null, 'INVALID_REQUEST');
      return;
    }

    // Encrypt and save the token
    const encryptedToken = encrypt(token);
    await User.findByIdAndUpdate(userId, {
      $set: {
        'groupMe.accessToken': encryptedToken,
        'groupMe.connectedAt': new Date(),
      },
    });

    sendSuccess(res, { message: 'Token saved successfully' });
  }
);

/**
 * Disconnect GroupMe (remove token)
 */
export const disconnectGroupMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
      return;
    }

    await User.findByIdAndUpdate(userId, {
      $unset: {
        'groupMe.accessToken': 1,
        'groupMe.connectedAt': 1,
        'groupMe.groups': 1,
      },
    });

    // Clear the service instance
    groupMeServiceInstance = null;

    sendSuccess(res, { message: 'GroupMe disconnected successfully' });
  }
);

/**
 * Get GroupMe connection status
 */
export const getConnectionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Try to get user ID from different sources
    let userId: string | undefined;

    // First try authenticated user
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.id) {
      userId = authReq.user.id;
    }
    // Otherwise, check if there's a session cookie or state parameter
    else if (req.cookies?.groupme_state) {
      try {
        const stateData = JSON.parse(Buffer.from(req.cookies.groupme_state, 'base64').toString());
        userId = stateData.userId;
      } catch (e) {
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

    // Use lean() so the return type is a plain object (not a Mongoose document)
    // and cast to a lightweight type that safely includes the optional groupMe field.
    type UserGroupMeLean = { groupMe?: { connectedAt?: Date; accessToken?: string } } | null;

    const user = (await User.findById(userId)
      .select('groupMe.connectedAt groupMe.accessToken')
      .lean()) as UserGroupMeLean;

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
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
};

/**
 * Initialize GroupMe configuration
 */
export const initializeGroupMe = async (req: Request, res: Response): Promise<void> => {
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

    groupMeServiceInstance = new GroupMeService(token);
    await groupMeServiceInstance.initialize();

    // Set up event listeners
    groupMeServiceInstance.on('new-messages', (groupId: string, messages: any[]) => {
      // TODO: Emit to all connected clients when Socket.io is properly set up
      console.log(`New messages in group ${groupId}:`, messages.length);
    });

    groupMeServiceInstance.on('error', (error: any) => {
      console.error('GroupMe polling error:', error);
    });

    // Start polling for configured groups
    const groupIds = process.env.GM_GROUPS?.split(',') || [];
    if (groupIds.length > 0) {
      groupMeServiceInstance.startPolling(groupIds);
    }

    const groups = await GroupMeConfig.find();

    res.status(200).json({
      success: true,
      message: 'GroupMe configuration initialized',
      data: { groups },
    });
  } catch (error) {
    console.error('Error initializing GroupMe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize GroupMe configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get user's GroupMe service instance
 */
const getUserGroupMeService = async (userId: string): Promise<GroupMeService | null> => {
  try {
    // Check cache first
    const cachedService = serviceInstances.get(userId);
    if (cachedService) {
      return cachedService;
    }

    const user = await User.findById<IUser>(userId).select('groupMe.accessToken');

    if (!user?.groupMe?.accessToken) {
      return null;
    }

    // Decrypt the token – if decryption fails (e.g., token saved with a different key
    // or legacy plain-text token), fall back to the stored string as-is.
    let accessToken: string;
    try {
      accessToken = decrypt(user.groupMe.accessToken);
    } catch (decryptErr) {
      console.error(
        `Failed to decrypt GroupMe token for user ${userId}. Token will be treated as invalid.`,
        decryptErr
      );
      // If decryption fails, consider the user not connected so that the UI can prompt
      // them to reconnect and store a fresh token. Returning null prevents repeated
      // decryption attempts on every request.
      return null;
    }

    // Create new service instance for this user
    const service = new GroupMeService(accessToken);

    try {
      await service.initialize();

      // Cache the service instance
      serviceInstances.set(userId, service);

      // Set up cleanup after 30 minutes of inactivity
      setTimeout(
        () => {
          serviceInstances.delete(userId);
          service.stopPolling();
        },
        30 * 60 * 1000
      ); // 30 minutes

      return service;
    } catch (initError) {
      console.error(`Failed to initialize GroupMe service for user ${userId}:`, initError);
      // If initialization fails, the token might be invalid
      return null;
    }
  } catch (error) {
    console.error('Error getting user GroupMe service:', error);
    return null;
  }
};

/**
 * Get all configured GroupMe groups
 */
export const getGroups = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
      return;
    }

    const service = await getUserGroupMeService(userId);
    if (!service) {
      sendError(
        res,
        401,
        'GroupMe not connected. Please connect your GroupMe account.',
        null,
        'NOT_CONNECTED'
      );
      return;
    }

    try {
      console.log('Fetching groups for user:', userId);
      // Use any type for the raw API response since it doesn't match our interface
      const apiGroups = await service.getGroups() as any[];
      console.log(`Retrieved ${apiGroups.length} groups from GroupMe API`);
      
      // If we got groups from the API, save them to the user's GroupMe config
      if (apiGroups.length > 0) {
        const user = await User.findById(userId);
        if (user && user.groupMe && user.groupMe.accessToken) {
          // Store the groups in the user's config for future use
          const groupsMap: Record<string, string> = {};
          apiGroups.forEach(group => {
            // The raw API response has id and name properties
            if (group.id && group.name) {
              groupsMap[group.id] = group.name;
            }
          });
          
          // Update or create GroupMe config
          await GroupMeConfig.findOneAndUpdate(
            { userId },
            { userId, groups: groupsMap },
            { upsert: true, new: true }
          );
          
          console.log(`Saved ${Object.keys(groupsMap).length} groups to user's config`);
        }
      }
      
      // Format the groups to match the expected structure in the frontend
      const formattedGroups = apiGroups.map(group => ({
        groupId: group.id,
        groupName: group.name,
        image_url: group.image_url,
        last_message: group.messages?.preview,
        messages_count: group.messages?.count
      }));
      
      sendSuccess(res, formattedGroups);
    } catch (error) {
      console.error('Error fetching groups from GroupMe API:', error);
      sendError(res, 500, 'Failed to fetch groups', null, 'API_ERROR');
    }
  }
);

/**
 * Get messages for a specific GroupMe group
 */
export const getGroupMessages = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
      return;
    }

    const service = await getUserGroupMeService(userId);
    if (!service) {
      sendError(
        res,
        401,
        'GroupMe not connected. Please connect your GroupMe account.',
        null,
        'NOT_CONNECTED'
      );
      return;
    }

    const { groupId } = req.params;
    const { before_id, limit = '20' } = req.query;

    const messages = await service.getMessages(
      groupId,
      before_id as string | undefined,
      parseInt(limit as string)
    );

    sendSuccess(res, messages);
  }
);

/**
 * Update a GroupMe group configuration
 */
export const updateGroupConfig = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { groupId } = req.params;
    const { botId, botName, enabled, displayOrder, displayInDashboard } = req.body;

    const updatedConfig = await GroupMeConfig.findOneAndUpdate(
      { groupId },
      {
        $set: {
          ...(botId !== undefined && { botId }),
          ...(botName !== undefined && { botName }),
          ...(enabled !== undefined && { enabled }),
          ...(displayOrder !== undefined && { displayOrder }),
          ...(displayInDashboard !== undefined && { displayInDashboard }),
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedConfig) {
      sendError(
        res,
        404,
        `GroupMe configuration for group ${groupId} not found`,
        null,
        'NOT_FOUND'
      );
      return;
    }

    // Update the bot mapping if service is initialized
    if (groupMeServiceInstance) {
      await groupMeService.updateBotMapping();
    }

    sendSuccess(res, { config: updatedConfig }, 200, 'GroupMe configuration updated successfully');
  }
);

/**
 * Send a message to a GroupMe group
 */
export const sendMessage = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // SAFETY CHECK: Log all message sends for audit trail
    console.warn('⚠️ GROUPME MESSAGE SEND REQUEST ⚠️');
    console.warn('User:', req.user?.id);
    console.warn('Group:', req.params.groupId);
    console.warn('Message:', req.body.text);
    console.warn('Time:', new Date().toISOString());

    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, 'Unauthorized', null, 'AUTH_ERROR');
      return;
    }

    const service = await getUserGroupMeService(userId);
    if (!service) {
      sendError(
        res,
        401,
        'GroupMe not connected. Please connect your GroupMe account.',
        null,
        'NOT_CONNECTED'
      );
      return;
    }

    const { groupId } = req.params;
    const { text, attachments } = req.body;

    if (!text && !attachments) {
      sendError(res, 400, 'Message must have text or attachments', null, 'INVALID_REQUEST');
      return;
    }

    const message = await service.sendMessage(groupId, text || '', attachments);
    sendSuccess(res, message);
  }
);

/**
 * Get GroupMe configuration for the authenticated user
 */
export const getConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.error('SERVER LOG: getConfig - ERROR: No userId in req.user');
      return res.status(401).json({ message: 'User not authenticated for getConfig' });
    }
    console.log(`SERVER LOG: getConfig - Called for userId: ${userId}`);
    const config = await GroupMeConfig.findOne({ userId });
    if (!config) {
      console.log(`SERVER LOG: getConfig - No GroupMeConfig found for userId: ${userId}`);
      return res.status(200).json(null);
    }
    console.log(
      `SERVER LOG: getConfig - Found GroupMeConfig for userId: ${userId}, accessToken presence: ${!!config.accessToken}`
    );
    return res.status(200).json(config);
  } catch (error) {
    console.error('SERVER LOG: Error in getConfig:', error);
    return res.status(500).json({ message: 'Failed to get GroupMe configuration' });
  }
};

/**
 * Save GroupMe configuration for the authenticated user
 */
export const saveConfig = async (req: AuthenticatedRequest, res: Response) => {
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
    const config = await GroupMeConfig.findOneAndUpdate(
      { userId },
      { userId, accessToken, groups },
      { upsert: true, new: true, runValidators: true }
    );

    // Mirror token into User document so downstream code can decrypt & create service
    await User.findByIdAndUpdate(userId, {
      $set: {
        'groupMe.accessToken': encryptedToken,
        'groupMe.connectedAt': new Date(),
      },
    });

    return res.status(200).json(config);
  } catch (error: unknown) {
    console.error('SERVER LOG: Error saving GroupMe config:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = error as any;
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

/**
 * Handle webhook events from GroupMe
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    console.log('SERVER LOG: GroupMe webhook received');
    const webhookData = req.body;
    res.status(200).send('OK');
    await groupMeService.processIncomingMessage(webhookData);
  } catch (error) {
    console.error('SERVER LOG: Error handling GroupMe webhook:', error);
  }
};

/**
 * Process incoming webhook message from GroupMe
 */
const processWebhookMessage = async (webhookData: any) => {
  try {
    if (webhookData.sender_type === 'bot') {
      return;
    }
    const message = new GroupMeMessage({
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
  } catch (error) {
    console.error('Error processing GroupMe message:', error);
  }
};

/**
 * Save GroupMe access token from OAuth callback
 */
export const saveGroupMeToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { access_token } = req.body;
  if (!userId || !access_token) return res.status(400).json({ error: 'Missing user or token' });

  // Encrypt the token
  const encryptedToken = encrypt(access_token);

  // Save to User
  await User.findByIdAndUpdate(userId, {
    $set: { 'groupMe.accessToken': encryptedToken, 'groupMe.connectedAt': new Date() }
  });

  // Save to GroupMeConfig
  await GroupMeConfig.findOneAndUpdate(
    { userId },
    { userId, accessToken: encryptedToken },
    { upsert: true, new: true }
  );

  res.sendStatus(204);
});
