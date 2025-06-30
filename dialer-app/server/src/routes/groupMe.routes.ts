import express from 'express';
import { authenticate as auth } from '../middleware/auth';
import * as groupMeController from '../controllers/groupMe.controller';
import User from '../models/User';
import GroupMeConfigModel from '../models/GroupMeConfig';

const router = express.Router();

// OAuth routes that DO NOT require authentication
router.post('/oauth/callback', groupMeController.handleOAuthCallback);
router.get('/oauth/status', auth, groupMeController.getConnectionStatus);
router.post('/oauth/initiate', groupMeController.initiateOAuth);

// Apply auth middleware for all other routes
router.use(auth);

// OAuth disconnect requires authentication
router.post('/oauth/disconnect', groupMeController.disconnectGroupMe);

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

interface GroupMeMessage {
  attachments: any[];
  avatar_url: string | null;
  created_at: number;
  group_id: string;
  id: string;
  name: string;
  sender_id: string;
  sender_type: 'user' | 'bot';
  source_guid: string;
  system: boolean;
  text: string | null;
  user_id: string;
}

// Webhook endpoint with userId parameter (no auth required for webhooks)
router.post('/webhook/:userId', async (req, res) => {
  const { userId } = req.params;
  const message = req.body as GroupMeMessage;

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

    const appUser = await User.findById(userId);
    if (!appUser) {
      console.warn(
        `GroupMe Webhook: User ${userId} not found in database. Cannot deliver message.`
      );
      return res.status(404).send('Application user not found');
    }

    console.log(`GroupMe Webhook: Message processed for user ${userId} via WebSocket`);

    res.status(202).send('Accepted');
  } catch (error) {
    console.error('GroupMe Webhook: Error processing message:', error);
    res.status(500).send('Error processing message');
  }
});

export default router;
