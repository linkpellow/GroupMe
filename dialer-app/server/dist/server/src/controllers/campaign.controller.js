"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLeadToCampaign = exports.getCampaignMetrics = exports.updateCampaignStatus = exports.deleteCampaign = exports.updateCampaign = exports.getCampaignById = exports.getCampaigns = exports.createCampaign = void 0;
const Campaign_1 = __importDefault(require("../models/Campaign"));
/**
 * Create a new email campaign
 */
const createCampaign = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { name, steps, startDate, recipients } = req.body;
        // Validate required fields
        if (!name || !steps || !startDate || !recipients || !recipients.length) {
            return res.status(400).json({
                message: 'Name, steps, start date, and at least one recipient are required',
            });
        }
        // Validate steps have templateId and delayDays
        if (!steps.every((step) => step.templateId && typeof step.delayDays === 'number')) {
            return res.status(400).json({
                message: 'Each step must have a templateId and delayDays',
            });
        }
        // Create campaign
        const campaign = new Campaign_1.default({
            userId: req.user.id,
            name,
            steps,
            startDate,
            recipients,
            recipientCount: recipients.length,
            status: 'scheduled',
        });
        await campaign.save();
        res.status(201).json(campaign);
    }
    catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ message: 'Failed to create campaign' });
    }
};
exports.createCampaign = createCampaign;
/**
 * Get all campaigns for the current user
 */
const getCampaigns = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { status } = req.query;
        const filter = { userId: req.user.id };
        // Add status filter if provided
        if (status && typeof status === 'string') {
            filter.status = status;
        }
        const campaigns = await Campaign_1.default.find(filter).sort({ createdAt: -1 });
        res.json(campaigns);
    }
    catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
};
exports.getCampaigns = getCampaigns;
/**
 * Get a specific campaign by ID
 */
const getCampaignById = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const campaign = await Campaign_1.default.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json(campaign);
    }
    catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).json({ message: 'Failed to fetch campaign' });
    }
};
exports.getCampaignById = getCampaignById;
/**
 * Update a campaign
 */
const updateCampaign = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { name, steps, startDate, recipients } = req.body;
        // Validate required fields
        if (!name || !steps || !startDate || !recipients || !recipients.length) {
            return res.status(400).json({
                message: 'Name, steps, start date, and at least one recipient are required',
            });
        }
        // Validate steps have templateId and delayDays
        if (!steps.every((step) => step.templateId && typeof step.delayDays === 'number')) {
            return res.status(400).json({
                message: 'Each step must have a templateId and delayDays',
            });
        }
        // Find the campaign
        const campaign = await Campaign_1.default.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        // Prevent updates to active or completed campaigns
        if (['active', 'completed'].includes(campaign.status)) {
            return res.status(400).json({
                message: 'Cannot update active or completed campaigns',
            });
        }
        // Update the campaign
        campaign.name = name;
        campaign.steps = steps;
        campaign.startDate = new Date(startDate);
        campaign.recipients = recipients;
        campaign.recipientCount = recipients.length;
        await campaign.save();
        res.json(campaign);
    }
    catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ message: 'Failed to update campaign' });
    }
};
exports.updateCampaign = updateCampaign;
/**
 * Delete a campaign
 */
const deleteCampaign = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const campaign = await Campaign_1.default.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        // Don't delete active campaigns
        if (campaign.status === 'active') {
            return res.status(400).json({
                message: 'Cannot delete an active campaign. Pause it first.',
            });
        }
        await Campaign_1.default.deleteOne({ _id: req.params.id });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ message: 'Failed to delete campaign' });
    }
};
exports.deleteCampaign = deleteCampaign;
/**
 * Update campaign status (pause/resume)
 */
const updateCampaignStatus = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { status } = req.body;
        // Validate status
        if (!status || !['scheduled', 'paused'].includes(status)) {
            return res.status(400).json({
                message: 'Valid status (scheduled or paused) is required',
            });
        }
        const campaign = await Campaign_1.default.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        // Don't update completed campaigns
        if (campaign.status === 'completed') {
            return res.status(400).json({
                message: 'Cannot update status of completed campaigns',
            });
        }
        campaign.status = status;
        await campaign.save();
        res.json(campaign);
    }
    catch (error) {
        console.error('Error updating campaign status:', error);
        res.status(500).json({ message: 'Failed to update campaign status' });
    }
};
exports.updateCampaignStatus = updateCampaignStatus;
/**
 * Get campaign analytics/metrics
 */
const getCampaignMetrics = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const campaign = await Campaign_1.default.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        // Calculate metrics
        const totalSteps = campaign.steps.length;
        const completedSteps = campaign.steps.filter((step) => step.status === 'sent').length;
        const failedSteps = campaign.steps.filter((step) => step.status === 'failed').length;
        const pendingSteps = campaign.steps.filter((step) => step.status === 'pending').length;
        // Calculate progress percentage
        const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        // Return campaign metrics
        const metrics = {
            totalRecipients: campaign.recipientCount,
            totalSteps,
            completedSteps,
            failedSteps,
            pendingSteps,
            progress,
            startDate: campaign.startDate,
            status: campaign.status,
            lastProcessed: campaign.lastProcessed,
        };
        res.json(metrics);
    }
    catch (error) {
        console.error('Error fetching campaign metrics:', error);
        res.status(500).json({ message: 'Failed to fetch campaign metrics' });
    }
};
exports.getCampaignMetrics = getCampaignMetrics;
/**
 * Add a lead to an existing campaign
 */
const addLeadToCampaign = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { campaignId, leadId } = req.body;
        // Validate required fields
        if (!campaignId || !leadId) {
            return res.status(400).json({
                message: 'Campaign ID and Lead ID are required',
            });
        }
        // Find the campaign
        const campaign = await Campaign_1.default.findOne({
            _id: campaignId,
            userId: req.user.id,
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        // Check if the lead already exists in the campaign
        if (campaign.recipients.includes(leadId)) {
            return res.status(400).json({
                message: 'Lead is already in this campaign',
            });
        }
        // Add the lead to the campaign
        campaign.recipients.push(leadId);
        campaign.recipientCount = campaign.recipients.length;
        await campaign.save();
        res.json({
            success: true,
            message: 'Lead added to campaign successfully',
            campaign,
        });
    }
    catch (error) {
        console.error('Error adding lead to campaign:', error);
        res.status(500).json({ message: 'Failed to add lead to campaign' });
    }
};
exports.addLeadToCampaign = addLeadToCampaign;
