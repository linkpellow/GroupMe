"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNewLeadNotification = exports.broadcastMessage = exports.sendMessageToUser = void 0;
// This MUST be the first import to ensure environment variables are loaded and validated before any other code runs.
require("./config/envLoader");
// ts-node/register removed to reduce memory overhead in production build. The TypeScript files are compiled to JS before runtime.
'use strict';
require("module-alias/register");
const path_1 = __importDefault(require("path"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – module-alias has no type declarations
const module_alias_1 = __importDefault(require("module-alias"));
// Register the @shared alias so compiled code can resolve shared modules correctly
module_alias_1.default.addAlias('@shared', path_1.default.join(__dirname, '../../shared'));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const jwt_config_1 = require("./config/jwt.config");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const leads_routes_1 = __importDefault(require("./routes/leads.routes"));
const calls_routes_1 = __importDefault(require("./routes/calls.routes"));
const dispositions_routes_1 = __importDefault(require("./routes/dispositions.routes"));
const settings_1 = __importDefault(require("./routes/settings"));
const emailTemplate_routes_1 = __importDefault(require("./routes/emailTemplate.routes"));
const campaign_routes_1 = __importDefault(require("./routes/campaign.routes"));
const groupMe_routes_1 = __importDefault(require("./routes/groupMe.routes"));
const integration_routes_1 = __importDefault(require("./routes/integration.routes"));
const integrations_routes_1 = __importDefault(require("./routes/integrations.routes"));
const webhook_routes_1 = __importDefault(require("./routes/webhook.routes"));
const documents_routes_1 = __importDefault(require("./routes/documents.routes"));
const textdrip_routes_1 = __importDefault(require("./routes/textdrip.routes"));
const dialCounts_routes_1 = __importDefault(require("./routes/dialCounts.routes"));
// Comment out routes for files confirmed missing from ./routes/ directory
// import clientRoutes from './routes/clients.routes';
// import csvUploadRoutes from './routes/csvUpload.routes';
// import notesRoutes from './routes/notes.routes';
// import usersRoutes from './routes/users.routes';
const gmailController = __importStar(require("./controllers/gmail.controller"));
const groupMeController = __importStar(require("./controllers/groupMe.controller"));
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
const dispositions_controller_1 = require("./controllers/dispositions.controller");
const User_1 = __importDefault(require("./models/User"));
const logger_1 = __importStar(require("./utils/logger"));
// Load environment variables.
// By explicitly loading '.env.local', we override any other .env files
// and ensure that the correct, secure secrets are used for development.
// This is the single source of truth for local environment configuration.
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env.local') });
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
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const port = process.env.PORT || 3001;
const host = '0.0.0.0'; // Force IPv4 to prevent EADDRINUSE on ::1 and ensure wider network accessibility
// WebSocket Server Setup
const wss = new ws_1.WebSocketServer({ server });
wss.on('connection', (ws) => {
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
                    const decodedToken = (0, jwt_config_1.verifyToken)(parsedMessage.token);
                    if (decodedToken && decodedToken._id) {
                        ws.userId = decodedToken._id;
                        console.log(`WebSocket authenticated for userId: ${ws.userId}`);
                        ws.send(JSON.stringify({
                            type: 'auth_success',
                            message: 'WebSocket authenticated',
                        }));
                    }
                    else {
                        console.error('WebSocket auth failed: Invalid token structure');
                        ws.send(JSON.stringify({
                            type: 'auth_failure',
                            message: 'Invalid token',
                            code: 'INVALID_TOKEN',
                        }));
                        // Disconnect client to force re-authentication
                        setTimeout(() => ws.close(1008, 'Invalid authentication'), 100);
                    }
                }
                catch (error) {
                    console.error('WebSocket authentication error:', error.message);
                    // Check if it's a JWT signature error
                    if (error.message && error.message.includes('invalid signature')) {
                        ws.send(JSON.stringify({
                            type: 'auth_failure',
                            message: 'Token signature mismatch. Please clear browser data and login again.',
                            code: 'TOKEN_MISMATCH',
                        }));
                    }
                    else {
                        ws.send(JSON.stringify({
                            type: 'auth_failure',
                            message: 'Authentication failed',
                            code: 'AUTH_ERROR',
                        }));
                    }
                    // Disconnect client to force re-authentication
                    setTimeout(() => ws.close(1008, 'Authentication failed'), 100);
                }
            }
        }
        catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
            }));
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
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false)
            return ws.terminate();
        ws.isAlive = false;
        ws.ping(() => { });
    });
}, 30000);
wss.on('close', () => {
    clearInterval(interval);
});
// WebSocket broadcast functions
const sendMessageToUser = (userId, message) => {
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN && client.userId === userId) {
            client.send(JSON.stringify(message));
        }
    });
};
exports.sendMessageToUser = sendMessageToUser;
const broadcastMessage = (message) => {
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};
exports.broadcastMessage = broadcastMessage;
const broadcastNewLeadNotification = (leadData) => {
    const notification = {
        type: 'new_lead_notification',
        data: leadData,
        timestamp: new Date().toISOString(),
    };
    console.log('Broadcasting new lead notification:', notification);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(notification));
        }
    });
};
exports.broadcastNewLeadNotification = broadcastNewLeadNotification;
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const dir = path_1.default.join(__dirname, '../uploads');
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    },
});
const upload = (0, multer_1.default)({ storage: storage });
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    'https://crokodial.com',
    'https://www.crokodial.com',
    process.env.CLIENT_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        // Allow same-origin requests (important for static assets)
        if (origin === 'https://crokodial.com' || origin === 'https://www.crokodial.com') {
            return callback(null, true);
        }
        // Allow requests from allowed origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`CORS block for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
// Using helmet with minimal configuration to avoid Permissions-Policy parsing errors
app.use((0, helmet_1.default)({
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
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Set server timeout to 5 minutes for large file processing
server.setTimeout(300000);
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/leads', leads_routes_1.default);
app.use('/api/calls', calls_routes_1.default);
app.use('/api/integration', integration_routes_1.default);
app.use('/api/integrations', integrations_routes_1.default);
app.use('/api/dispositions', dispositions_routes_1.default);
app.use('/api/settings', settings_1.default);
const ENABLE_GMAIL = process.env.ENABLE_GMAIL === 'true';
let gmailRoutes = null;
if (ENABLE_GMAIL) {
    gmailRoutes = require('./routes/gmail.routes').default;
}
app.use('/api/email-templates', emailTemplate_routes_1.default);
app.use('/api/campaigns', campaign_routes_1.default);
app.use('/api/groupme', groupMe_routes_1.default);
app.use('/api/webhooks', webhook_routes_1.default);
app.use('/api/documents', documents_routes_1.default);
app.use('/api/textdrip', textdrip_routes_1.default);
app.use('/api/dial-counts', dialCounts_routes_1.default);
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
app.post('/api/import-csv-direct', auth_1.auth, upload.single('file'), async (req, res) => {
    /* ... */
});
app.get('/api/test', (req, res) => res.json({ message: `Production Server ALIVE on port ${port}` }));
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
    path_1.default.join(__dirname, '..', '..', 'client', 'dist'), // ../../client/dist  (dist/src -> dialer-app/server)
    path_1.default.join(__dirname, '..', '..', '..', 'client', 'dist'), // ../../../client/dist (dist/server/src -> dialer-app)
    path_1.default.join(__dirname, '..', '..', '..', '..', 'client', 'dist'), // ../../../../client/dist  (dist/server/src -> project root)
    path_1.default.join(process.cwd(), 'dialer-app', 'client', 'dist'), // absolute from project root when cwd is repo root
];
const clientDistPath = candidateClientDistPaths.find((p) => fs_1.default.existsSync(p));
if (clientDistPath) {
    // Serve static files from the client dist directory
    app.use(express_1.default.static(clientDistPath));
    // Serve index.html for all non-API routes that don't match static files
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api'))
            return next();
        // Check if the requested file exists in the static directory
        const requestedFile = path_1.default.join(clientDistPath, req.path);
        if (fs_1.default.existsSync(requestedFile) && fs_1.default.statSync(requestedFile).isFile()) {
            // File exists, let express.static handle it
            return next();
        }
        // File doesn't exist, serve index.html for SPA routing
        res.sendFile(path_1.default.resolve(clientDistPath, 'index.html'));
    });
}
else {
    console.warn('Client dist path not found. Checked:', candidateClientDistPaths);
}
app.use(errorHandler_1.errorHandler);
const CAMPAIGN_ENABLED = process.env.ENABLE_CAMPAIGN_PROCESSOR !== 'false';
const startServer = async () => {
    try {
        if (!process.env.MONGODB_URI)
            throw new Error('MONGODB_URI not defined');
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected (Production Server).');
        const adminUser = await User_1.default.findOne({ role: 'admin' }).select('_id').lean();
        if (adminUser && adminUser._id) {
            try {
                await (0, dispositions_controller_1.seedDefaultDispositionsOnStartup)(adminUser._id.toString());
                console.log('Dispositions seeded/verified.');
            }
            catch (seedError) {
                console.error('Disposition seed error (continuing):', seedError);
            }
        }
        else {
            console.warn('Admin user not found, skipping disposition seed.');
        }
        if (CAMPAIGN_ENABLED) {
            console.log('Campaign processor job enabled.');
            // startCampaignProcessor(); // moved under CAMPAIGN_ENABLED guard below
        }
        else {
            console.log('Campaign processor job disabled via env flag');
        }
        server.listen({ port, host }, () => {
            logger_1.default.info(`Production Server listening on http://${host}:${port}.`);
            logger_1.default.info('WebSocket server initialized');
            (0, logger_1.startMemoryLogging)();
        });
    }
    catch (error) {
        console.error('Failed to start production server:', error);
        process.exit(1);
    }
};
let isShuttingDown = false;
const gracefulShutdown = (signal) => {
    if (isShuttingDown)
        return;
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
            mongoose_1.default.connection.close().then(() => {
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
