import express, { Router } from 'express';
import { auth } from '../middleware/auth';
import * as gmailController from '../controllers/gmail.controller';

const router: Router = express.Router();

// Auth routes
router.get('/auth-url', auth, gmailController.generateAuthUrl);
router.get('/callback', gmailController.handleOAuthCallback);
// Add an additional route to handle Google's redirect to /api/auth/gmail/callback
router.get('/auth/gmail/callback', gmailController.handleOAuthCallback);
router.get('/status', auth, gmailController.getConnectionStatus);
router.post('/disconnect', auth, gmailController.disconnectGmail);

// Email routes
router.get('/messages', auth, gmailController.getMessages);
router.get('/messages/:id', auth, gmailController.getMessage);
router.post('/send', auth, gmailController.sendEmail);
router.post('/messages/:id/trash', auth, gmailController.trashEmail);
router.get('/labels', auth, gmailController.getLabels);

// Process marketplace leads
router.post('/process-marketplace-leads', auth, gmailController.processMarketplaceLeads);

export default router;
