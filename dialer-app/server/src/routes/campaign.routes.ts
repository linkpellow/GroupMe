import express, { Router } from 'express';
import { auth } from '../middleware/auth';
import * as campaignController from '../controllers/campaign.controller';

const router: Router = express.Router();

// Campaign CRUD routes
router.post('/', auth, campaignController.createCampaign);
router.get('/', auth, campaignController.getCampaigns);
router.get('/:id', auth, campaignController.getCampaignById);
router.put('/:id', auth, campaignController.updateCampaign);
router.delete('/:id', auth, campaignController.deleteCampaign);

// Campaign status and metrics routes
router.patch('/:id/status', auth, campaignController.updateCampaignStatus);
router.get('/:id/metrics', auth, campaignController.getCampaignMetrics);

// Add lead to campaign route
router.post('/add-lead', auth, campaignController.addLeadToCampaign);

export default router;
