import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import LeadModel, { ILead } from '../models/Lead';
import { STATE_PHONE_MAP, DEFAULT_SENDER_PHONE } from '../config/textdrip.config';
import UserModel, { IUser } from '../models/User';

interface TextdripCampaign {
  id: string;
  title: string;
  type: string;
}

interface TextdripErrorResponse {
  message?: string;
  error?: string;
  status?: boolean;
}

interface PhoneEntry {
  phone: string;
  phone_token: string;
  primary: 0 | 1;
  state?: string;
}

interface TextDripCredentials {
  baseUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

class TextdripService {
  private api: AxiosInstance;
  private cache: { campaigns: TextdripCampaign[]; expiresAt: number } | null = null;
  private phoneCache: { list: PhoneEntry[]; expiresAt: number } | null = null;

  constructor(private token: string) {
    this.api = axios.create({
      baseURL: 'https://api.textdrip.com/api',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Selects the appropriate Textdrip sender phone number based on the lead's state.
   * Falls back to the default sender if no state-specific number is found.
   */
  private getSenderForLead(lead: ILead): string {
    const state = lead.state?.toUpperCase();
    if (state && STATE_PHONE_MAP[state]) {
      return STATE_PHONE_MAP[state];
    }
    return DEFAULT_SENDER_PHONE;
  }

  /**
   * Fetch campaigns from Textdrip, with in-memory 5-minute cache.
   */
  async getCampaigns(): Promise<TextdripCampaign[]> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.campaigns;
    }

    console.log('Fetching campaigns from Textdrip API...');
    const response = await this.api.post('/get-campaign');
    console.log('Raw response from Textdrip:', JSON.stringify(response.data, null, 2));

    const campaigns: TextdripCampaign[] = response.data?.data || [];

    this.cache = {
      campaigns,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes
    };
    return campaigns;
  }

  /**
   * Normalize phone into E.164-ish format TextDrip accepts – digits only with leading +1 if length==10.
   */
  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`; // US default
    if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
    if (digits.startsWith('+')) return digits;
    return `+${digits}`;
  }

  /**
   * Compute SHA-256 hex digest for phone-token header.
   */
  private phoneToken(phone: string): string {
    return crypto.createHash('sha256').update(this.normalizePhone(phone)).digest('hex');
  }

  /**
   * Lookup an existing contact by phone number. Returns contactId or null.
   */
  private async lookupContactByPhone(phone: string): Promise<string | null> {
    try {
      const res = await this.api.post('/get-contact-detail', { phone });
      if (res.data?.status && res.data?.contact) {
        // contact may be object or array; support id or contact_id field
        const c = res.data.contact;
        return c.id || c.contact_id || null;
      }
      return null;
    } catch (err: any) {
      // 400 Contact not found → treat as null, rethrow others
      if (err.response?.data?.message?.includes('Contact not found')) return null;
      throw err;
    }
  }

  /**
   * Create a new contact from lead details and return contactId.
   */
  private async createContact(lead: ILead): Promise<string> {
    const phone = this.normalizePhone(lead.phone || lead.phoneNumber || '');
    if (!phone) throw new Error('Lead missing phone, cannot create contact');

    const payload = {
      name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'CRM Contact',
      phone,
      email: lead.email || '',
      opted_out: 0,
      campaign: '',
    };

    await this.api.post('/create-contact', payload, {
      headers: { 'phone-token': this.phoneToken(phone) },
    });

    // Textdrip create-contact does not return id, so fetch again
    const id = await this.lookupContactByPhone(phone);
    if (!id) throw new Error('Failed to retrieve contactId after creation');
    return id;
  }

  /**
   * Ensure Lead has a valid Textdrip contactId, creating the contact if necessary.
   * Returns the contactId.
   */
  async ensureContact(lead: ILead): Promise<string> {
    if (lead.textdripContactId) return lead.textdripContactId;

    const phone = this.normalizePhone(lead.phone || lead.phoneNumber || '');
    if (!phone) throw new Error('Lead missing phone, cannot sync with Textdrip');

    let contactId = await this.lookupContactByPhone(phone);
    if (!contactId) {
      contactId = await this.createContact(lead);
    }

    // Persist to DB but don't await heavily inside service – do fire-and-forget
    lead.textdripContactId = contactId;
    try {
      await lead.save();
    } catch (e) {
      console.error('Failed to save textdripContactId to lead', e);
    }

    return contactId;
  }

  async addCampaignToContact(
    lead: ILead,
    contactId: string,
    campaignId: string,
    alreadyScheduledRemove = false
  ): Promise<any> {
    try {
      const senderPhone = this.getSenderForLead(lead);
      const tokenHeader = await this.resolveSenderToken(senderPhone);
      const { data } = await this.api.post(
        '/add-campaign',
        {
          contact_id: contactId,
          campaign_id: campaignId,
          already_scheduled_remove: alreadyScheduledRemove,
        },
        {
          headers: { 'phone-token': tokenHeader },
        }
      );
      if (!data?.status) throw new Error(data?.message ?? 'Unknown error');
      return data;
    } catch (err) {
      this.unwrap(err);
    }
  }

  async sendMessage(lead: ILead, message: string, imageId?: string | null) {
    try {
      const senderPhone = this.getSenderForLead(lead);
      const tokenHeader = await this.resolveSenderToken(senderPhone);
      const { data } = await this.api.post(
        '/send-message',
        {
          receiver: this.normalizePhone(lead.phone || lead.phoneNumber || ''),
          message,
          sender: senderPhone,
          ...(imageId ? { image: imageId } : {}),
        },
        { headers: { 'phone-token': tokenHeader } }
      );
      if (!data?.status) throw new Error(data?.message ?? 'Unknown error');
      return data;
    } catch (err) {
      this.unwrap(err);
    }
  }

  private unwrap(err: unknown) {
    if ((err as AxiosError).response) {
      const { status, data } = (err as AxiosError<TextdripErrorResponse>).response!;
      throw new Error(
        `TextDrip ${status}: ${typeof data === 'string' ? data : data.message || data.error || 'Unknown error'}`
      );
    }
    throw err;
  }

  /**
   * Fetch & cache the account phone list (24-h TTL). Returns empty array if API fails.
   */
  private async getPhoneList(): Promise<PhoneEntry[]> {
    const now = Date.now();
    if (this.phoneCache && this.phoneCache.expiresAt > now) {
      return this.phoneCache.list;
    }
    try {
      const { data } = await this.api.post('/get-phone-list');
      const list: PhoneEntry[] = data?.data || [];
      this.phoneCache = { list, expiresAt: now + 24 * 60 * 60 * 1000 }; // 24 h
      if (!list.length) {
        console.error(
          '[Textdrip] get-phone-list returned 0 numbers – API token may lack permission or account has no numbers'
        );
      }
      return list;
    } catch (err) {
      console.error('[Textdrip] Failed to fetch phone list:', (err as Error).message);
      return [];
    }
  }

  /**
   * Resolve the phone_token to use for a given sender phone (must match one in account list).
   * Falls back to hashing when not found.
   */
  private async resolveSenderToken(senderPhoneRaw: string): Promise<string> {
    const senderPhone = this.normalizePhone(senderPhoneRaw);
    const list = await this.getPhoneList();
    const match = list.find((p) => this.normalizePhone(p.phone) === senderPhone);
    if (match?.phone_token) return match.phone_token;
    // fallback – use primary number token if exists
    const primary = list.find((p) => p.primary === 1);
    if (primary?.phone_token) return primary.phone_token;
    // ultimate fallback – existing hash logic
    return this.phoneToken(senderPhone);
  }
}

export const createTextdripService = (overrideToken?: string): TextdripService => {
  const token = overrideToken || process.env.TEXTDRIP_API_TOKEN;
  console.log(
    'Creating Textdrip service with token:',
    token ? `${token.slice(0, 6)}...` : 'No Token Found'
  );
  if (!token) {
    throw new Error('No TextDrip token provided');
  }
  return new TextdripService(token);
};

export type { TextdripCampaign };

const BASE_URL = 'https://api.textdrip.com/api';
const TOKEN = process.env.TEXTDRIP_API_TOKEN;
const SENDER_PHONE = '18136679756'; // Your Textdrip phone number

/* ------------- shared helpers ------------------------------------------------ */
const buildHeaders = (phoneToken: string | null = null) => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...(phoneToken ? { 'phone-token': phoneToken } : {}),
});

const unwrap = (err: unknown) => {
  if ((err as AxiosError).response) {
    const { status, data } = (err as AxiosError<TextdripErrorResponse>).response!;
    throw new Error(
      `TextDrip ${status}: ${typeof data === 'string' ? data : data.message || data.error || 'Unknown error'}`
    );
  }
  throw err;
};

/* ------------- 1) Drop contact into a drip campaign -------------------------- */
export async function addCampaign(
  contactId: string,
  campaignId: string,
  alreadyScheduledRemove = false
) {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/add-campaign`,
      {
        contact_id: contactId,
        campaign_id: campaignId,
        already_scheduled_remove: alreadyScheduledRemove,
      },
      { headers: buildHeaders(contactId) }
    );
    if (!data?.status) throw new Error(data?.message ?? 'Unknown error');
    return data; // { status:true, message:"Campaign added successfully." }
  } catch (err) {
    unwrap(err);
  }
}

/* ------------- 2) Quick-drip one-off message --------------------------------- */
export async function sendMessage(
  receiver: string, // E.164 number e.g. +15551234567
  message: string,
  imageId?: string | null // optional TextDrip image ID
) {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/send-message`,
      {
        receiver,
        message,
        sender: SENDER_PHONE, // Add sender phone number
        ...(imageId ? { image: imageId } : {}),
      },
      { headers: buildHeaders(receiver) }
    );
    if (!data?.status) throw new Error(data?.message ?? 'Unknown error');
    return data; // { status:true, message:"<Message details>" }
  } catch (err) {
    unwrap(err);
  }
}

// NOTE: I am omitting getConversations and getChats for now as they are not used.

const buildBaseUrl = (user: IUser, fallbackBase?: string) => {
  return (
    user.textdrip?.baseUrl?.replace(/\/?$/, '') || // remove trailing /
    fallbackBase?.replace(/\/?$/, '') ||
    'https://api.textdrip.com/v1'
  );
};

export const loginToTextDrip = async (creds: TextDripCredentials, user: IUser) => {
  const base = creds.baseUrl || buildBaseUrl(user);

  // ----- 1) API-KEY ONLY FLOW -------------------------------------------------
  if (creds.apiKey && !creds.username && !creds.password) {
    user.textdrip = {
      ...user.textdrip,
      baseUrl: base,
      apiKey: creds.apiKey,
      accessToken: creds.apiKey, // reuse key as bearer token
      connectedAt: new Date(),
    };
    await user.save();
    return user.textdrip;
  }

  // ----- 2) EMAIL + PASSWORD LOGIN ------------------------------------------
  const url = `${base}/login`;
  const payload = {
    email: creds.username ?? '',
    password: creds.password ?? '',
  };

  const { data } = await axios.post<{ success: boolean; message: string; token: string }>(
    url,
    payload,
    { timeout: 10000 }
  );

  if (!data?.success || !data?.token) {
    throw new Error(data?.message || 'Login failed');
  }

  user.textdrip = {
    ...user.textdrip,
    baseUrl: base,
    username: creds.username,
    accessToken: data.token,
    connectedAt: new Date(),
  };
  await user.save();
  return user.textdrip;
};

export const ensureFreshAccessToken = async (user: IUser) => {
  if (!user.textdrip?.accessToken) {
    throw new Error('TextDrip not connected');
  }

  // If we never stored refreshToken, just return existing accessToken (API-key or non-expiring token)
  if (!user.textdrip.refreshToken) {
    return user.textdrip.accessToken;
  }

  const expires = user.textdrip.tokenExpires?.getTime() || 0;
  if (Date.now() < expires - 5 * 60 * 1000) {
    return user.textdrip.accessToken; // still valid
  }

  // refresh flow
  const base = buildBaseUrl(user);
  const url = `${base}/auth/refresh`;
  const { data } = await axios.post<TokenResponse>(
    url,
    { refreshToken: user.textdrip.refreshToken },
    { timeout: 10000, headers: { Authorization: `Bearer ${user.textdrip.accessToken}` } }
  );
  user.textdrip.accessToken = data.access_token;
  user.textdrip.refreshToken = data.refresh_token;
  user.textdrip.tokenExpires = new Date(Date.now() + data.expires_in * 1000);
  await user.save();
  return data.access_token;
};

export const getCampaigns = async (user: IUser) => {
  const access = await ensureFreshAccessToken(user);
  const base = buildBaseUrl(user);
  const url = `${base}/campaigns`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${access}` },
    timeout: 10000,
  });
  return data;
};
