import { Request, Response } from 'express';
import { google } from 'googleapis';
import UserModel from '../models/User';
import fs from 'fs';
import path from 'path';
import { IUser } from '../models/User';

// Load the credentials from the JSON file
const CREDENTIALS_PATH = path.join(
  __dirname,
  '../../credentials/client_secret_1_205244009759-s8j73nmtn7sfsk5aktilt0jcgq4n9qp2.apps.googleusercontent.com.json'
);

let credentials: any = null;
let oauth2Client: any = null;

try {
  if (fs.existsSync(CREDENTIALS_PATH)) {
    credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    // Configure OAuth client
    oauth2Client = new google.auth.OAuth2(
      credentials.web?.client_id || process.env.GMAIL_CLIENT_ID,
      credentials.web?.client_secret || process.env.GMAIL_CLIENT_SECRET,
      credentials.web?.redirect_uris?.[0] || process.env.GMAIL_REDIRECT_URI
    );
  } else {
    console.warn('Gmail credentials file not found. Gmail integration will be disabled.');
    // Create a dummy oauth2Client to prevent crashes
    oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID || 'dummy_client_id',
      process.env.GMAIL_CLIENT_SECRET || 'dummy_secret',
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/api/gmail/oauth2callback'
    );
  }
} catch (error) {
  console.error('Error loading Gmail credentials:', error);
  // Create a dummy oauth2Client to prevent crashes
  oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID || 'dummy_client_id',
    process.env.GMAIL_CLIENT_SECRET || 'dummy_secret',
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/api/gmail/oauth2callback'
  );
}

// Gmail API scopes for authentication
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

/**
 * Generate OAuth URL for Gmail integration
 */
export const generateAuthUrl = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const referer = req.query.referer as string;

    // Use all the scopes defined at the top of the file
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: user._id.toString(),
      prompt: 'consent',
      // Include referer parameter in the redirect URI
      ...(referer && {
        redirect_uri: `${process.env.SERVER_URL}/api/gmail/oauth-callback?referer=${referer}`,
      }),
    });

    res.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ message: 'Failed to generate authorization URL' });
  }
};

/**
 * Handle OAuth callback after user grants permission
 */
export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code not provided' });
    }

    if (!state) {
      return res.status(400).json({ message: 'User state not provided' });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get user's Gmail profile
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const gmailEmail = profile.data.emailAddress || '';

    // Store tokens in user document
    await UserModel.findByIdAndUpdate(state, {
      gmailAccessToken: tokens.access_token,
      gmailRefreshToken: tokens.refresh_token,
      gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      gmailConnected: true,
      gmailEmail,
    });

    // Check if the request has a referer or source parameter
    const referer = req.query.referer as string;

    // If the referer is 'integrations', redirect to the integrations page
    if (referer === 'integrations') {
      res.redirect('/integrations?connected=true');
    } else {
      // Otherwise redirect to the Gmail page (default behavior)
      res.redirect('/gmail?connected=true');
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/gmail?error=authorization_failed');
  }
};

/**
 * Get the connection status for the current user
 */
export const getConnectionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      connected: user.gmailConnected || false,
      email: user.gmailEmail || null,
    });
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({ message: 'Failed to get connection status' });
  }
};

/**
 * Disconnect the user's Gmail account
 */
export const disconnectGmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await UserModel.findByIdAndUpdate(req.user.id, {
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
      gmailConnected: false,
      gmailEmail: null,
    });

    res.json({ success: true, message: 'Gmail account disconnected' });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ message: 'Failed to disconnect Gmail account' });
  }
};

/**
 * Get authenticated Gmail client for user
 */
const getGmailClient = async (userId: string) => {
  // Get user from database
  const user = await UserModel.findById(userId);

  if (!user || !user.gmailAccessToken) {
    throw new Error('User not found or Gmail not connected');
  }

  // Check if token is expired
  const tokenExpiry = user.gmailTokenExpiry?.getTime() || 0;
  const isExpired = tokenExpiry < Date.now();

  // Set credentials
  oauth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken,
    expiry_date: tokenExpiry,
  });

  // Refresh token if expired
  if (isExpired && user.gmailRefreshToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update tokens in database
      await UserModel.findByIdAndUpdate(userId, {
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      });

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh Gmail token');
    }
  }

  // Return Gmail client
  return google.gmail({ version: 'v1', auth: oauth2Client });
};

/**
 * Get user's Gmail messages
 */
export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get query parameters
    const maxResults = parseInt(req.query.maxResults as string) || 20;
    const pageToken = req.query.pageToken as string;
    const labelIds = req.query.labelIds as string;

    // Get Gmail client
    const gmail = await getGmailClient(req.user.id);

    // List messages with query parameters
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      pageToken: pageToken || undefined,
      labelIds: labelIds ? labelIds.split(',') : undefined,
    });

    // Get detailed message data for each message
    const messages = [];

    if (response.data.messages && response.data.messages.length > 0) {
      for (const message of response.data.messages) {
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.id || '',
          format: 'metadata',
        });

        // Process and simplify message data
        const headers = messageDetails.data.payload?.headers;

        const from = headers?.find((h) => h.name === 'From')?.value || '';
        const subject = headers?.find((h) => h.name === 'Subject')?.value || '';
        const date = headers?.find((h) => h.name === 'Date')?.value || '';

        messages.push({
          id: message.id,
          threadId: message.threadId,
          snippet: messageDetails.data.snippet,
          labelIds: messageDetails.data.labelIds,
          from,
          subject,
          date,
          unread: messageDetails.data.labelIds?.includes('UNREAD') || false,
        });
      }
    }

    res.json({
      messages,
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ message: 'Failed to get messages' });
  }
};

/**
 * Get a specific Gmail message by ID
 */
export const getMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const messageId = req.params.id;

    if (!messageId) {
      return res.status(400).json({ message: 'Message ID is required' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(req.user.id);

    // Get full message data
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    res.json(message.data);
  } catch (error) {
    console.error('Error getting message details:', error);
    res.status(500).json({ message: 'Failed to get message details' });
  }
};

/**
 * Send an email
 */
export const sendEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { to, subject, body, cc, bcc } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ message: 'To, subject, and body are required' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(req.user.id);

    // Create email content (RFC 5322)
    const user = await UserModel.findById(req.user.id);
    const fromEmail = user?.gmailEmail || '';

    const emailLines = [];
    emailLines.push(`From: ${fromEmail}`);
    emailLines.push(`To: ${to}`);

    if (cc) {
      emailLines.push(`Cc: ${cc}`);
    }
    if (bcc) {
      emailLines.push(`Bcc: ${bcc}`);
    }

    emailLines.push(`Subject: ${subject}`);
    emailLines.push('Content-Type: text/html; charset=utf-8');
    emailLines.push('MIME-Version: 1.0');
    emailLines.push('');
    emailLines.push(body);

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

    res.json({
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
};

/**
 * Get Gmail labels for the user
 */
export const getLabels = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(req.user.id);

    // List labels
    const response = await gmail.users.labels.list({
      userId: 'me',
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error getting labels:', error);
    res.status(500).json({ message: 'Failed to get labels' });
  }
};

/**
 * Move a message to trash (delete)
 */
export const trashEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const messageId = req.params.id;

    if (!messageId) {
      return res.status(400).json({ message: 'Message ID is required' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(req.user.id);

    // Move the message to trash
    const response = await gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    });

    res.json({
      success: true,
      message: 'Email moved to trash',
    });
  } catch (error) {
    console.error('Error moving email to trash:', error);
    res.status(500).json({ message: 'Failed to move email to trash' });
  }
};

/**
 * Process Marketplace email leads
 * This function checks for emails from marketplace lead sources and extracts lead data
 */
export const processMarketplaceLeads = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('Starting marketplace lead processing for user:', req.user.id);

    // Get Gmail client
    const gmail = await getGmailClient(req.user.id);

    // Search for marketplace lead emails - expanded search query to catch more potential sources
    // This includes any email with marketplace, usha marketplace, or leads in the sender or subject
    const response = await gmail.users.messages.list({
      userId: 'me',
      // Expanded search query to catch more marketplace lead emails
      q: 'from:marketplace OR from:ushamarketplace OR from:leads OR subject:marketplace OR subject:"new lead" OR subject:"New Health Lead"',
      maxResults: 50, // Process up to 50 emails at once
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      console.log('No marketplace lead emails found');
      return res.json({
        message: 'No marketplace lead emails found',
        processedCount: 0,
      });
    }

    console.log(`Found ${response.data.messages.length} potential marketplace emails to process`);

    let successCount = 0;
    let failedCount = 0;
    const processedIds = [];

    // Process each email from the marketplace lead source
    for (const message of response.data.messages) {
      try {
        // Get full message details
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.id || '',
          format: 'full',
        });

        // Get headers to check if this is a new (unread) email
        const headers = messageDetails.data.payload?.headers || [];
        const fromHeader = headers.find((h) => h.name === 'From');
        const subjectHeader = headers.find((h) => h.name === 'Subject');

        console.log(
          `Processing email - From: ${fromHeader?.value}, Subject: ${subjectHeader?.value}`
        );

        // Get email body
        const body = getEmailBody(messageDetails.data);
        if (!body) {
          console.log(`Email ${message.id} has no readable body`);
          continue;
        }

        // Check if this might be a marketplace lead email by looking for common patterns
        // More flexible check that looks for several possible indicators of a lead email
        const isLeadEmail =
          body.includes('New Health Lead') ||
          body.includes('Campaign Information') ||
          body.includes('Lead Information') ||
          body.includes('lead details') ||
          body.includes('marketplace') ||
          body.includes('Marketplace');

        if (!isLeadEmail) {
          console.log(`Email ${message.id} doesn't appear to be a lead email - skipping`);
          continue;
        }

        // Extract lead information from the email
        console.log(`Attempting to extract lead data from email ${message.id}`);

        // Use basic extraction since specialized parser has been removed
        let leadData;

        console.log('Using basic lead extraction');
        leadData = extractLeadData(body);

        if (!leadData) {
          console.log(`Failed to extract lead data from email ${message.id}`);
          failedCount++;
          continue;
        }

        // Ensure source is set to 'Marketplace' for proper filtering
        leadData.source = 'Marketplace';

        // Create the lead
        console.log('Creating lead with data:', JSON.stringify(leadData, null, 2));
        const LeadModel = (await import('../models/Lead')).default;
        const lead = await LeadModel.create(leadData);

        console.log(`Successfully created lead: ${lead._id}`);

        // Mark the email as processed (add a label or mark as read)
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id || '',
          requestBody: {
            addLabelIds: ['PROCESSED'],
            removeLabelIds: ['UNREAD'],
          },
        });

        processedIds.push(message.id);
        successCount++;
      } catch (error) {
        console.error(`Error processing marketplace lead email ${message.id}:`, error);
        failedCount++;
      }
    }

    const resultMessage = `Processed ${successCount} marketplace leads (${failedCount} failed)`;
    console.log(resultMessage);

    res.json({
      message: resultMessage,
      processedCount: successCount,
      failedCount,
      processedIds,
    });
  } catch (error) {
    console.error('Error processing marketplace leads:', error);
    res.status(500).json({
      message: 'Failed to process marketplace leads',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Helper function to extract the email body from a Gmail message
 */
function getEmailBody(message: any): string {
  if (!message || !message.payload) {
    return '';
  }

  // Try to find HTML part first
  const htmlPart = findBodyPart(message.payload, 'text/html');
  if (htmlPart && htmlPart.body.data) {
    return decodeBase64Url(htmlPart.body.data);
  }

  // Fall back to plain text
  const textPart = findBodyPart(message.payload, 'text/plain');
  if (textPart && textPart.body.data) {
    return decodeBase64Url(textPart.body.data);
  }

  return '';
}

/**
 * Helper function to find a specific MIME part in a message
 */
function findBodyPart(part: any, mimeType: string): any {
  if (part.mimeType === mimeType) {
    return part;
  }

  if (part.parts) {
    for (const subPart of part.parts) {
      const found = findBodyPart(subPart, mimeType);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Helper function to decode base64url-encoded strings
 */
function decodeBase64Url(data: string): string {
  // Convert base64url to base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');

  try {
    // Decode base64 to a UTF-8 string
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Error decoding base64:', error);
    return '';
  }
}

/**
 * Extract lead data from email body
 */
function extractLeadData(body: string): any {
  try {
    // Extract key sections using regex patterns
    const nameMatch = body.match(/First Name:\s*([^\n\r]*)/i);
    const lastNameMatch = body.match(/Last Name:\s*([^\n\r]*)/i);
    const phoneMatch = body.match(/Primary Phone:\s*([^\n\r]*)/i);
    const emailMatch = body.match(/Email:\s*([^\n\r]*)/i);
    const addressMatch = body.match(/Address:\s*([^\n\r]*)/i);
    const cityMatch = body.match(/City:\s*([^\n\r]*)/i);
    const stateMatch = body.match(/State:\s*([^\n\r]*)/i);
    const zipMatch = body.match(/Zip:\s*([^\n\r]*)/i);
    const genderMatch = body.match(/Gender:\s*([^\n\r]*)/i);
    const dobMatch = body.match(/Date of Birth:\s*([^\n\r]*)/i);
    const heightMatch = body.match(/Height:\s*([^\n\r]*)/i);
    const weightMatch = body.match(/Weight:\s*([^\n\r]*)/i);
    const smokerMatch = body.match(/Smoker:\s*([^\n\r]*)/i);
    const incomeMatch = body.match(/Income:\s*([^\n\r]*)/i);
    const householdMatch = body.match(/Household:\s*([^\n\r]*)/i);
    const campaignNameMatch = body.match(/Name:\s*([^\n\r]*)/i); // Campaign name
    const priceMatch = body.match(/Price:\s*([^\n\r]*)/i);
    const leadIdMatch = body.match(/Lead Id:\s*([^\n\r]*)/i);

    // Extract comments (if any)
    const commentsMatch = body.match(/Comments:\s*([^\n\r]*)/i);

    // Create lead object
    const firstName = nameMatch ? nameMatch[1].trim() : '';
    const lastName = lastNameMatch ? lastNameMatch[1].trim() : '';

    const leadData = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone: phoneMatch ? phoneMatch[1].trim() : '',
      email: emailMatch ? emailMatch[1].trim() : '',
      street1: addressMatch ? addressMatch[1].trim() : '',
      city: cityMatch ? cityMatch[1].trim() : '',
      state: stateMatch ? stateMatch[1].trim() : '',
      zipcode: zipMatch ? zipMatch[1].trim() : '',
      gender: genderMatch ? genderMatch[1].trim() : '',
      dob: dobMatch ? dobMatch[1].trim() : '',
      height: heightMatch ? heightMatch[1].trim() : '',
      weight: weightMatch ? weightMatch[1].trim() : '',
      tobaccoUser: smokerMatch ? smokerMatch[1].trim().toLowerCase() === 'yes' : false,
      householdIncome: incomeMatch ? incomeMatch[1].trim() : '',
      householdSize: householdMatch ? householdMatch[1].trim() : '',
      campaignName: campaignNameMatch ? campaignNameMatch[1].trim() : '',
      price: priceMatch ? priceMatch[1].trim() : '',
      nextgenId: leadIdMatch ? leadIdMatch[1].trim() : '',
      source: 'Marketplace', // Important: set source to Marketplace
      notes: commentsMatch
        ? `Marketplace Lead\nComments: ${commentsMatch[1].trim()}`
        : 'Marketplace Lead',
      status: 'New',
    };

    return leadData;
  } catch (error) {
    console.error('Error extracting lead data:', error);
    return null;
  }
}

// Add alias for backward compatibility
export const getAuthUrl = generateAuthUrl;
