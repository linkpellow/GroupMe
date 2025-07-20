import express from 'express';
import {
  getSourceCodeAnalytics,
  getCPAAnalytics,
  getCampaignAnalytics,
  getLeadDetailsAnalytics,
  getDemographicsAnalytics
} from '../controllers/analytics.controller';
import { auth } from '../middleware/auth';

const router = express.Router();

/**
 * Analytics Routes - SOLD Lead Performance Analytics
 * All routes require authentication and focus on SOLD lead analysis
 */

// Source Code Analytics - Track source_hash performance and quality
router.get('/sold/source-codes', auth, getSourceCodeAnalytics);

// CPA Analytics - Cost Per Acquisition analysis
router.get('/sold/cpa', auth, getCPAAnalytics);

// Campaign Analytics - Campaign performance based on SOLD conversions
router.get('/sold/campaigns', auth, getCampaignAnalytics);

// Lead Details Analytics - Comprehensive lead data with source codes
router.get('/sold/lead-details', auth, getLeadDetailsAnalytics);

// Demographics Analytics - Geographic SOLD distribution analysis
router.get('/sold/demographics', auth, getDemographicsAnalytics);

export default router; 