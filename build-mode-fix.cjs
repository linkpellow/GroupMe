#!/usr/bin/env node

/**
 * Production Build Mode Fix for Crokodial
 * 
 * This script bypasses the development server issues by:
 * 1. Building the client app in production mode
 * 2. Configuring the server to serve the static build
 * 3. Starting both in a properly configured environment
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT_DIR = __dirname;
const SERVER_DIR = path.join(ROOT_DIR, 'dialer-app', 'server');
const CLIENT_DIR = path.join(ROOT_DIR, 'dialer-app', 'client');
const SERVER_INDEX_PATH = path.join(SERVER_DIR, 'src', 'index.ts');

console.log('🚀 Starting Crokodial Production Mode Fix...');

// Kill existing processes
function killExistingProcesses() {
  console.log('\n🔄 Cleaning up existing processes...');
  try {
    execSync('kill $(lsof -ti :3001) 2>/dev/null || true');
    execSync('kill $(lsof -ti :5173) 2>/dev/null || true');
    console.log('✅ Existing processes terminated');
  } catch (error) {
    // Ignore errors
  }
}

// Fix TypeScript errors in server code
function fixServerCode() {
  console.log('\n🔧 Fixing TypeScript errors in server code...');
  
  if (!fs.existsSync(SERVER_INDEX_PATH)) {
    console.error('❌ Server index.ts not found!');
    return false;
  }
  
  // Create a backup
  const backupPath = `${SERVER_INDEX_PATH}.backup-${Date.now()}`;
  fs.copyFileSync(SERVER_INDEX_PATH, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  let content = fs.readFileSync(SERVER_INDEX_PATH, 'utf8');
  
  // Fix async route handlers by wrapping them in IIFE
  const patterns = [
    {
      search: /app\.get\('\/api\/auth\/gmail\/callback', async \(req: express\.Request, res: express\.Response/,
      replace: "app.get('/api/auth/gmail/callback', (req: express.Request, res: express.Response"
    },
    {
      search: /app\.post\('\/api\/import-csv-direct', upload\.single\('file'\), async function\(req: express\.Request, res: express\.Response/,
      replace: "app.post('/api/import-csv-direct', upload.single('file'), (req: express.Request, res: express.Response"
    },
    {
      search: /app\.post\('\/api\/webhooks\/nextgen', async \(req: express\.Request, res: express\.Response/,
      replace: "app.post('/api/webhooks/nextgen', (req: express.Request, res: express.Response"
    }
  ];
  
  let modified = false;
  patterns.forEach(pattern => {
    if (content.match(pattern.search)) {
      content = content.replace(pattern.search, pattern.replace);
      modified = true;
    }
  });
  
  if (modified) {
    // Add IIFE wrappers for async callbacks
    content = content.replace(
      /app\.get\('\/api\/auth\/gmail\/callback', \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {[\s\S]*?console\.log\('Received callback at \/api\/auth\/gmail\/callback, forwarding to Gmail controller'\);[\s\S]*?await gmailController\.handleOAuthCallback\(req, res\);/g,
      `app.get('/api/auth/gmail/callback', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('Received callback at /api/auth/gmail/callback, forwarding to Gmail controller');
  (async () => {
    try {
      await gmailController.handleOAuthCallback(req, res);
    } catch (error) {
      console.error('Gmail callback error:', error);
      res.status(500).json({ error: 'Internal server error in Gmail callback' });
    }
  })();`
    );

    // Add IIFE to other endpoints
    const addAsyncWrapper = (str) => {
      return str.replace(
        /(try {)/g,
        `(async () => {\n    $1`
      ).replace(
        /}\) catch \(error\) {[\s\S]*?res\.status\(500\)\.json\(\{[\s\S]*?}\);[\s\S]*?}\);/g,
        match => match + "\n  })();"
      );
    };

    // Apply to CSV import
    if (content.includes("app.post('/api/import-csv-direct', upload.single('file'), (req: express.Request, res: express.Response")) {
      content = content.replace(
        /app\.post\('\/api\/import-csv-direct', upload\.single\('file'\), \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {[\s\S]*?try {/,
        match => addAsyncWrapper(match)
      );
    }

    // Apply to NextGen webhook
    if (content.includes("app.post('/api/webhooks/nextgen', (req: express.Request, res: express.Response")) {
      content = content.replace(
        /app\.post\('\/api\/webhooks\/nextgen', \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {[\s\S]*?try {/,
        match => addAsyncWrapper(match)
      );
    }

    // Update the content
    fs.writeFileSync(SERVER_INDEX_PATH, content);
    console.log('✅ Server code fixed');
  } else {
    console.log('✅ Server code already fixed or doesn\'t need fixing');
  }
  
  // Configure server to serve client build
  console.log('\n🔧 Configuring server to serve client build...');
  
  content = fs.readFileSync(SERVER_INDEX_PATH, 'utf8');
  
  // Check if we need to update the static file serving
  if (!content.includes('express.static(path.join(__dirname, \'../../client/dist\'))')) {
    content = content.replace(
      /app\.use\(express\.static\(path\.join\(__dirname, ['"]client['"]\)\)\);/,
      `// Serve client build files
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Serve client index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
  } else {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  }
});`
    );
    
    fs.writeFileSync(SERVER_INDEX_PATH, content);
    console.log('✅ Server configured to serve client build');
  } else {
    console.log('✅ Server already configured to serve client build');
  }
  
  return true;
}

// Build the client app in production mode
async function buildClient() {
  console.log('\n🏗️ Building client in production mode...');
  
  try {
    // Ensure needed dependencies
    const packageJsonPath = path.join(CLIENT_DIR, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Make sure scripts are correctly set
    if (!packageJson.scripts.build) {
      packageJson.scripts.build = "vite build";
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
    
    // Build the client - fixed path with proper escaping
    execSync(`cd "${CLIENT_DIR}" && npm run build`, { stdio: 'inherit' });
    console.log('✅ Client built successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Error building client:', error.message);
    return false;
  }
}

// Start the server
function startServer() {
  console.log('\n🚀 Starting server...');
  
  try {
    const serverProcess = spawn('npm', ['start'], { cwd: SERVER_DIR });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(`[SERVER] ${data.toString().trim()}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`[SERVER ERROR] ${data.toString().trim()}`);
    });
    
    console.log('✅ Server started');
    
    return serverProcess;
  } catch (error) {
    console.error('❌ Error starting server:', error.message);
    return null;
  }
}

// Main function
async function main() {
  try {
    // Kill existing processes
    killExistingProcesses();
    
    // Fix server code
    const serverFixed = fixServerCode();
    if (!serverFixed) {
      console.error('❌ Failed to fix server code');
      return;
    }
    
    // Build client
    const clientBuilt = await buildClient();
    if (!clientBuilt) {
      console.error('❌ Failed to build client');
      return;
    }
    
    // Start server
    const serverProcess = startServer();
    if (!serverProcess) {
      console.error('❌ Failed to start server');
      return;
    }
    
    console.log('\n✅ Crokodial now running in production mode!');
    console.log('🌐 Access the application at: http://localhost:3001');
    console.log('\n⚠️ Since we\'re in production mode:');
    console.log('1. The application is served from the server at port 3001');
    console.log('2. You do not need to run the client separately');
    console.log('3. Any changes to client code will require a rebuild (run this script again)');
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Crokodial...');
      serverProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ An error occurred:', error);
  }
}

// Run the main function
main(); 