"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * Analytics Routes - SOLD Lead Performance Analytics
 * All routes require authentication and focus on SOLD lead analysis
 */
// Source Code Analytics - Track source_hash performance and quality
router.get('/sold/source-codes', auth_1.auth, analytics_controller_1.getSourceCodeAnalytics);
// CPA Analytics - Cost Per Acquisition analysis
router.get('/sold/cpa', auth_1.auth, analytics_controller_1.getCPAAnalytics);
// Campaign Analytics - Campaign performance based on SOLD conversions
router.get('/sold/campaigns', auth_1.auth, analytics_controller_1.getCampaignAnalytics);
// Lead Details Analytics - Comprehensive lead data with source codes
router.get('/sold/lead-details', auth_1.auth, analytics_controller_1.getLeadDetailsAnalytics);
// Demographics Analytics - Geographic SOLD distribution analysis
router.get('/sold/demographics', auth_1.auth, analytics_controller_1.getDemographicsAnalytics);
exports.default = router;
