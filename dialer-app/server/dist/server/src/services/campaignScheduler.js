"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCampaigns = processCampaigns;
const Campaign_1 = __importDefault(require("../models/Campaign"));
const Lead_1 = __importDefault(require("../models/Lead"));
const EmailTemplate_1 = __importDefault(require("../models/EmailTemplate"));
const User_1 = __importDefault(require("../models/User"));
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Gmail credentials - handle missing file gracefully
const CREDENTIALS_PATH = path_1.default.join(__dirname, '../../credentials/client_secret_1_205244009759-s8j73nmtn7sfsk5aktilt0jcgq4n9qp2.apps.googleusercontent.com.json');
let credentials = null;
try {
    if (fs_1.default.existsSync(CREDENTIALS_PATH)) {
        credentials = JSON.parse(fs_1.default.readFileSync(CREDENTIALS_PATH, 'utf8'));
        console.log('Gmail credentials loaded successfully');
    }
    else {
        console.warn('Gmail credentials file not found. Gmail features will be disabled.');
        console.warn('To enable Gmail integration, add credentials file at:', CREDENTIALS_PATH);
    }
}
catch (error) {
    console.error('Error loading Gmail credentials:', error);
    console.warn('Gmail features will be disabled.');
}
/**
 * Creates a Gmail client with the user's tokens
 */
async function getGmailClient(userId) {
    // Check if credentials are loaded
    if (!credentials) {
        throw new Error('Gmail credentials not configured. Campaign email sending is disabled.');
    }
    const user = await User_1.default.findById(userId);
    if (!user || !user.gmailRefreshToken) {
        throw new Error(`User ${userId} doesn't have valid Gmail tokens`);
    }
    // Configure OAuth client
    const oauth2Client = new googleapis_1.google.auth.OAuth2(credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);
    // Set credentials
    oauth2Client.setCredentials({
        refresh_token: user.gmailRefreshToken,
    });
    // Return Gmail client
    return googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
}
/**
 * Process a specific campaign step
 */
async function processCampaignStep(campaign, step, stepIndex) {
    try {
        console.log(`Processing step ${stepIndex} of campaign ${campaign.name}`);
        // Get the template
        const template = await EmailTemplate_1.default.findById(step.templateId);
        if (!template) {
            console.error(`Template ${step.templateId} not found for campaign ${campaign._id}`);
            step.status = 'failed';
            step.error = 'Template not found';
            await campaign.save();
            return false;
        }
        // Get all recipients
        const leads = await Lead_1.default.find({
            _id: { $in: campaign.recipients },
        });
        if (leads.length === 0) {
            console.error(`No recipients found for campaign ${campaign._id}`);
            step.status = 'failed';
            step.error = 'No recipients found';
            await campaign.save();
            return false;
        }
        // Get the Gmail client
        const gmail = await getGmailClient(campaign.userId.toString());
        // Get user (for from email)
        const user = await User_1.default.findById(campaign.userId);
        if (!user || !user.gmailEmail) {
            step.status = 'failed';
            step.error = 'User email not found';
            await campaign.save();
            return false;
        }
        // Track message IDs
        const messageIds = [];
        // Send email to each recipient
        for (const lead of leads) {
            try {
                // Create personalized email content
                const personalizedSubject = parseTemplate(template.subject, lead);
                const personalizedBody = parseTemplate(template.body, lead);
                // Construct email lines for RFC 5322 format
                const emailLines = [];
                emailLines.push(`From: ${user.gmailEmail}`);
                emailLines.push(`To: ${lead.email}`);
                emailLines.push(`Subject: ${personalizedSubject}`);
                emailLines.push('Content-Type: text/html; charset=utf-8');
                emailLines.push('MIME-Version: 1.0');
                emailLines.push('');
                emailLines.push(personalizedBody);
                // Encode the email
                const email = emailLines.join('\r\n').trim();
                const encodedEmail = Buffer.from(email)
                    .toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');
                // Send the email
                const response = await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: {
                        raw: encodedEmail,
                    },
                });
                // Store message ID for tracking
                if (response.data.id) {
                    messageIds.push(response.data.id);
                }
                // Add a small delay to prevent rate limiting
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            catch (error) {
                console.error(`Error sending email to ${lead.email}:`, error);
                // Continue with other leads even if one fails
            }
        }
        // Update step status
        step.status = 'sent';
        step.sentAt = new Date();
        step.messageIds = messageIds;
        // Save changes
        await campaign.save();
        console.log(`Completed step ${stepIndex} for campaign ${campaign.name}`);
        return true;
    }
    catch (error) {
        console.error(`Error processing campaign step: ${error}`);
        step.status = 'failed';
        step.error = String(error);
        await campaign.save();
        return false;
    }
}
/**
 * Parse template variables with lead data
 */
function parseTemplate(text, lead) {
    const replacements = {
        '<firstname>': lead.firstName || '',
        '<lastname>': lead.lastName || '',
        '<name>': lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        '<email>': lead.email || '',
        '<phone>': lead.phone || '',
        '<state>': lead.state || '',
        '<city>': lead.city || '',
        '<zip>': lead.zipcode || '',
        '<zipcode>': lead.zipcode || '',
        '<dob>': lead.dob || '',
        '<height>': lead.height || '',
        '<weight>': lead.weight || '',
        '<gender>': lead.gender || '',
    };
    let parsedText = text;
    Object.entries(replacements).forEach(([variable, value]) => {
        parsedText = parsedText.replace(new RegExp(variable, 'gi'), value);
    });
    return parsedText;
}
/**
 * Finds and processes campaigns due for sending
 */
async function processCampaigns() {
    console.log('Starting campaign processing');
    try {
        const now = new Date();
        // Find campaigns that are scheduled or active
        const campaigns = await Campaign_1.default.find({
            status: { $in: ['scheduled', 'active'] },
        });
        console.log(`Found ${campaigns.length} campaigns to process`);
        for (const campaign of campaigns) {
            try {
                const campaignStartDate = new Date(campaign.startDate);
                // Skip if campaign hasn't started yet
                if (campaignStartDate > now) {
                    console.log(`Campaign ${campaign.name} hasn't started yet`);
                    continue;
                }
                // Set to active if it was scheduled and start date has passed
                if (campaign.status === 'scheduled' && campaignStartDate <= now) {
                    campaign.status = 'active';
                    await campaign.save();
                }
                // Check each step
                let allStepsCompleted = true;
                for (let i = 0; i < campaign.steps.length; i++) {
                    const step = campaign.steps[i];
                    // Skip steps that are already processed
                    if (step.status === 'sent' || step.status === 'failed') {
                        continue;
                    }
                    // Calculate when this step should be sent
                    const stepDate = new Date(campaign.startDate);
                    stepDate.setDate(stepDate.getDate() + step.delayDays);
                    // Check if it's time to send this step
                    if (stepDate <= now) {
                        console.log(`Processing step ${i} for campaign ${campaign.name}`);
                        await processCampaignStep(campaign, step, i);
                    }
                    else {
                        console.log(`Step ${i} for campaign ${campaign.name} is scheduled for later`);
                        allStepsCompleted = false;
                    }
                }
                // Update campaign status if all steps are completed
                if (allStepsCompleted && !campaign.steps.some((step) => step.status === 'pending')) {
                    campaign.status = 'completed';
                    await campaign.save();
                    console.log(`Campaign ${campaign.name} marked as completed`);
                }
                // Update last processed time
                campaign.lastProcessed = now;
                await campaign.save();
            }
            catch (error) {
                console.error(`Error processing campaign ${campaign._id}:`, error);
            }
        }
        console.log('Campaign processing complete');
    }
    catch (error) {
        console.error('Error processing campaigns:', error);
    }
}
