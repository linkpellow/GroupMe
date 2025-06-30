import { Router } from 'express';
import { createTextdripService } from '../services/textdripService';
import LeadModel from '../models/Lead';
import { authenticate as auth } from '../middleware/auth';
import axios from 'axios';
import UserModel from '../models/User';
import { loginToTextDrip, getCampaigns } from '../services/textdripService';
import * as textdripController from '../controllers/textdrip.controller';

const router: Router = Router();

/**
 * GET /api/textdrip/campaigns
 * Fetches all Textdrip campaigns.
 */
router.get('/campaigns', auth, async (req: Request, res: Response) => {
  try {
    console.log('GET /api/textdrip/campaigns route hit');
    const userId = req.user!._id;
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const data = await getCampaigns(user);
    res.json(data);
  } catch (e: any) {
    console.error('TextDrip campaigns error:', e);
    res.status(500).json({ message: e.message || 'Failed to fetch campaigns' });
  }
});

/**
 * POST /api/textdrip/campaign
 * body: { leadId, campaignId, removeExisting?:boolean }
 */
router.post('/campaign', auth, async (req, res) => {
  const { leadId, campaignId, removeExisting = false } = req.body;

  console.log('Textdrip add-campaign request:', {
    leadId,
    campaignId,
    removeExisting,
    headers: req.headers,
  });

  if (!leadId || !campaignId) {
    return res.status(400).json({ status: false, message: 'leadId and campaignId are required' });
  }

  try {
    const service = createTextdripService(req.user?.textdripToken);
    const lead = await LeadModel.findById(leadId);

    if (!lead) {
      return res.status(404).json({ status: false, message: 'Lead not found' });
    }

    // Ensure contact exists in Textdrip and get contactId
    const contactId = await service.ensureContact(lead);

    const result = await service.addCampaignToContact(lead, contactId, campaignId, removeExisting);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ status: false, message: (e as Error).message });
  }
});

/**
 * POST /api/textdrip/quick-drip
 * body: { phone, message, imageId?:string }
 */
router.post('/quick-drip', auth, async (req, res) => {
  const { leadId, message, imageId = null } = req.body;
  if (!leadId || !message) {
    return res.status(400).json({ status: false, message: 'leadId and message are required' });
  }
  try {
    const service = createTextdripService(req.user?.textdripToken);
    const lead = await LeadModel.findById(leadId);
    if (!lead) {
      return res.status(404).json({ status: false, message: 'Lead not found' });
    }
    const result = await service.sendMessage(lead, message, imageId);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ status: false, message: (e as Error).message });
  }
});

/**
 * POST /api/textdrip/login
 * body: { email, password }
 * Logs the user into TextDrip, stores returned token on their user record.
 */
router.post('/login', auth, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'email and password are required' });
  }
  try {
    const tdResp = await axios.post(
      'https://api.textdrip.com/api/login',
      {
        email,
        password,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { token } = tdResp.data || {};
    if (!token) {
      return res.status(400).json({ success: false, message: 'Login response missing token' });
    }

    // Persist token on user
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    req.user.textdripToken = token;
    req.user.textdripConnectedAt = new Date();
    await req.user.save();

    res.json({ success: true, message: 'TextDrip connected', tokenSaved: true });
  } catch (error: any) {
    console.error('TextDrip login error:', error?.response?.data || error.message);
    const message = error?.response?.data?.message || 'Login failed';
    return res.status(400).json({ success: false, message });
  }
});

// POST /api/textdrip/connect
router.post('/connect', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { baseUrl, email, username, password, apiKey } = req.body;
    const loginEmail = email || username; // support old field name
    if ((!loginEmail || !password) && !apiKey) {
      return res.status(400).json({ message: 'Provide username/password or apiKey' });
    }

    const creds = { baseUrl, username: loginEmail, password, apiKey };
    const details = await loginToTextDrip(creds, user);
    res.json({ connected: true, details });
  } catch (e: any) {
    console.error('TextDrip connect error:', e);
    res.status(500).json({ message: e.message || 'Connect failed' });
  }
});

// DELETE /api/textdrip (disconnect)
router.delete('/', auth, async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findByIdAndUpdate(
      req.user!._id,
      { $unset: { textdrip: '' } },
      { new: true }
    );
    res.json({ disconnected: true, user });
  } catch (e: any) {
    console.error('TextDrip disconnect error:', e);
    res.status(500).json({ message: e.message || 'Failed to disconnect' });
  }
});

export default router;
