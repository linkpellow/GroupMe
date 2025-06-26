// This MUST be the first import to ensure environment variables are loaded and validated before any other code runs.
import './config/envLoader';

// ts-node/register removed to reduce memory overhead in production build. The TypeScript files are compiled to JS before runtime.
'use strict';
import 'module-alias/register';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – module-alias has no type declarations
import moduleAlias from 'module-alias';

// Register the @shared alias so compiled code can resolve shared modules correctly
moduleAlias.addAlias('@shared', path.join(__dirname, '../../shared'));

import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import { parse } from 'csv-parse';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { JWT_SECRET, verifyToken } from './config/jwt.config';

import authRoutes from './routes/auth.routes';
import leadsRoutes from './routes/leads.routes';
import callsRoutes from './routes/calls.routes';
import dispositionsRoutes from './routes/dispositions.routes';
import settingsRoutes from './routes/settings';
import emailTemplateRoutes from './routes/emailTemplate.routes';
import campaignRoutes from './routes/campaign.routes';
import groupMeRoutes from './routes/groupMe.routes';
import integrationRoutes from './routes/integration.routes';
import integrationsRoutes from './routes/integrations.routes';
import webhookRoutes from './routes/webhook.routes';
import documentsRoutes from './routes/documents.routes';
import textdripRoutes from './routes/textdrip.routes';
import dialCountsRoutes from './routes/dialCounts.routes';

// Comment out routes for files confirmed missing from ./routes/ directory
// import clientRoutes from './routes/clients.routes';
// import csvUploadRoutes from './routes/csvUpload.routes';
// import notesRoutes from './routes/notes.routes';
// import usersRoutes from './routes/users.routes';

import * as gmailController from './controllers/gmail.controller';
import * as groupMeController from './controllers/groupMe.controller';
import { auth, isAdmin } from './middleware/auth';
import { fetchUshaLeads } from './services/ushaService';
import { API_SID } from './services/apiConfig';
import { importRingyLeads } from './services/ringyService';
import { API_KEYS, validateApiKey } from './config/apiKeys';
import { errorHandler } from './middleware/errorHandler';
import { seedDefaultDispositionsOnStartup } from './controllers/dispositions.controller';
import { execSync } from 'child_process';
import { startCampaignProcessor } from './cron/campaignProcessor';
import UserModel from './models/User';
import LeadModel from './models/Lead';
import logger, { startMemoryLogging } from './utils/logger';

// Load environment variables.
// By explicitly loading '.env.local', we override any other .env files
// and ensure that the correct, secure secrets are used for development.
// This is the single source of truth for local environment configuration.
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ------------------- SECURITY HARDENING: JWT SECRET CHECK -------------------
// This is a critical security check. The server must not start with a weak
// or default JWT_SECRET. The '.env.local' file should define a secret of at
// least 32 characters.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('\\n\\n\x1b[31m[FATAL ERROR] INSECURE JWT_SECRET DETECTED.\x1b[0m');
  console.error('\x1b[33mThe JWT_SECRET environment variable is missing, or is less than 32 characters long.\x1b[0m');
  console.error('For security, the server will not start.');
  console.error('Please create a file named ".env.local" in the "dialer-app/server" directory and add a line like this:');
  console.error('\\n  \x1b[32mJWT_SECRET=your_super_secret_random_string_of_at_least_32_characters\x1b[0m\\n');
  process.exit(1); // Exit immediately with a failure code
}
// --------------------------------------------------------------------------

// ----- Sanity log to confirm critical env vars are loaded ------------------
const jwtPreview = (process.env.JWT_SECRET || '').slice(0, 6) || 'NONE';
const tdPreview = (process.env.TEXTDRIP_API_TOKEN || '').slice(0, 6) || 'NONE';
console.log(`ENV sanity → JWT_SECRET: ${jwtPreview}… (${(process.env.JWT_SECRET || '').length} chars), TEXTDRIP_API_TOKEN: ${tdPreview}… (${(process.env.TEXTDRIP_API_TOKEN || '').length} chars)`);

console.log('=== PRODUCTION SERVER: UNIFIED IMPLEMENTATION ===');
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;
const host = '0.0.0.0'; // Force IPv4 to prevent EADDRINUSE on ::1 and ensure wider network accessibility

// WebSocket Server Setup
const wss = new WebSocketServer({ server });

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
}

wss.on('connection', (ws: ExtendedWebSocket) => {
  console.log('Client connected to WebSocket');
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    console.log('Received WebSocket message:', message.toString());
    try {
      const parsedMessage = JSON.parse(message.toString());
      if (parsedMessage.type === 'authenticate' && parsedMessage.token) {
        try {
          const decodedToken = verifyToken(parsedMessage.token) as { _id: string };
          if (decodedToken && decodedToken._id) {
            ws.userId = decodedToken._id;
            console.log(`WebSocket authenticated for userId: ${ws.userId}`);
            ws.send(
              JSON.stringify({
                type: 'auth_success',
                message: 'WebSocket authenticated',
              }),
            );
          } else {
            console.error('WebSocket auth failed: Invalid token structure');
            ws.send(
              JSON.stringify({
                type: 'auth_failure',
                message: 'Invalid token',
                code: 'INVALID_TOKEN',
              }),
            );
            // Disconnect client to force re-authentication
            setTimeout(() => ws.close(1008, 'Invalid authentication'), 100);
          }
        } catch (error: any) {
          console.error('WebSocket authentication error:', error.message);

          // Check if it's a JWT signature error
          if (error.message && error.message.includes('invalid signature')) {
            ws.send(
              JSON.stringify({
                type: 'auth_failure',
                message: 'Token signature mismatch. Please clear browser data and login again.',
                code: 'TOKEN_MISMATCH',
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: 'auth_failure',
                message: 'Authentication failed',
                code: 'AUTH_ERROR',
              }),
            );
          }

          // Disconnect client to force re-authentication
          setTimeout(() => ws.close(1008, 'Authentication failed'), 100);
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }),
      );
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws: ExtendedWebSocket) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// WebSocket broadcast functions
export const sendMessageToUser = (userId: string, message: object) => {
  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(JSON.stringify(message));
    }
  });
};

export const broadcastMessage = (message: object) => {
  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

export const broadcastNewLeadNotification = (leadData: {
  leadId: string;
  name: string;
  source: string;
  isNew: boolean;
}) => {
  const notification = {
    type: 'new_lead_notification',
    data: leadData,
    timestamp: new Date().toISOString(),
  };

  console.log('Broadcasting new lead notification:', notification);

  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification));
    }
  });
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage: storage });

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  process.env.CLIENT_URL,
].filter(Boolean);
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else {
      console.warn(`CORS block for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
// Using helmet with minimal configuration to avoid Permissions-Policy parsing errors
app.use(helmet({
  // Disable contentSecurityPolicy to avoid complex CSP issues
  contentSecurityPolicy: false,
  // Keep other security headers
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: true,
  xssFilter: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set server timeout to 5 minutes for large file processing
server.setTimeout(300000);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/dispositions', dispositionsRoutes);
app.use('/api/settings', settingsRoutes);
const ENABLE_GMAIL = process.env.ENABLE_GMAIL === 'true';
let gmailRoutes: any = null;
if (ENABLE_GMAIL) {
  gmailRoutes = require('./routes/gmail.routes').default;
}
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/groupme', groupMeRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/textdrip', textdripRoutes);
app.use('/api/dial-counts', dialCountsRoutes);

// Comment out app.use for missing routes only
// app.use('/api/clients', clientRoutes);
// app.use('/api/csv', csvUploadRoutes);
// app.use('/api/notes', notesRoutes);
// app.use('/api/users', usersRoutes);

if (ENABLE_GMAIL && gmailRoutes) {
  app.use('/api/gmail', gmailRoutes);
  app.get('/api/auth/gmail/callback', gmailController.handleOAuthCallback);
}

app.post('/groupme/callback', groupMeController.handleWebhook);
app.post(
  '/api/import-csv-direct',
  auth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    /* ... */
  },
);

app.get('/api/test', (req, res) =>
  res.json({ message: `Production Server ALIVE on port ${port}` }),
);

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'Production Server',
    port,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Determine client dist directory dynamically to work in dev, build, and Heroku slug paths
const candidateClientDistPaths = [
  path.join(__dirname, '..', '..', 'client', 'dist'), // ../../client/dist  (dist/src -> dialer-app/server)
  path.join(__dirname, '..', '..', '..', 'client', 'dist'), // ../../../client/dist (dist/server/src -> dialer-app)
  path.join(__dirname, '..', '..', '..', '..', 'client', 'dist'), // ../../../../client/dist  (dist/server/src -> project root)
  path.join(process.cwd(), 'dialer-app', 'client', 'dist'), // absolute from project root when cwd is repo root
];

const clientDistPath = candidateClientDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(clientDistPath as string, 'index.html'));
  });
} else {
  console.warn('Client dist path not found. Checked:', candidateClientDistPaths);
}
app.use(errorHandler);

const CAMPAIGN_ENABLED = process.env.ENABLE_CAMPAIGN_PROCESSOR !== 'false';

const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not defined');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected (Production Server).');
    const adminUser = await UserModel.findOne({ role: 'admin' }).select('_id').lean();
    if (adminUser && adminUser._id) {
      try {
        await seedDefaultDispositionsOnStartup(adminUser._id.toString());
        console.log('Dispositions seeded/verified.');
      } catch (seedError) {
        console.error('Disposition seed error (continuing):', seedError);
      }
    } else {
      console.warn('Admin user not found, skipping disposition seed.');
    }
    if (CAMPAIGN_ENABLED) {
      console.log('Campaign processor job enabled.');
      // startCampaignProcessor(); // moved under CAMPAIGN_ENABLED guard below
    } else {
      console.log('Campaign processor job disabled via env flag');
    }
      server.listen({ port, host }, () => {
        logger.info(`Production Server listening on http://${host}:${port}.`);
        logger.info('WebSocket server initialized');
        startMemoryLogging();
      });
  } catch (error) {
    console.error('Failed to start production server:', error);
    process.exit(1);
  }
};

let isShuttingDown = false;
const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[GRACEFUL SHUTDOWN] Received ${signal}. Beginning shutdown sequence...`);

  // Force exit after a timeout if shutdown hangs for any reason
  const shutdownTimeout = setTimeout(() => {
    console.error('[GRACEFUL SHUTDOWN] Shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000); // 10-second timeout

  // 1. Stop accepting new HTTP connections. The callback will be executed once all
  // existing connections are closed.
  server.close((err) => {
    if (err) {
      console.error('[GRACEFUL SHUTDOWN] Error closing HTTP server:', err);
      return process.exit(1);
    }
    console.log('[GRACEFUL SHUTDOWN] HTTP server closed.');

    // 2. Now close the WebSocket server.
    wss.close((err) => {
      if (err) {
        console.error('[GRACEFUL SHUTDOWN] Error closing WebSocket server:', err);
        return process.exit(1);
      }
      console.log('[GRACEFUL SHUTDOWN] WebSocket server closed.');

      // 3. Finally, close the database connection.
      mongoose.connection.close().then(() => {
        console.log('[GRACEFUL SHUTDOWN] MongoDB connection closed.');
        console.log('[GRACEFUL SHUTDOWN] Shutdown complete.');
        clearTimeout(shutdownTimeout);
        process.exit(0);
      }).catch(dbErr => {
        console.error('[GRACEFUL SHUTDOWN] Error closing MongoDB connection:', dbErr);
        process.exit(1);
      });
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => {
  // ts-node-dev uses SIGUSR2; handle it gracefully
  gracefulShutdown('SIGUSR2');
  // ts-node-dev expects the process to exit; it will handle the restart
});

startServer();
