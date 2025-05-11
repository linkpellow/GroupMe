#!/usr/bin/env node

/**
 * Diagnostic & Fix Script for Crokodial Server Issues
 * 
 * This script will:
 * 1. Diagnose the TypeScript errors in the server code
 * 2. Apply fixes to resolve the issues
 * 3. Restart the server
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERVER_PATH = path.join(__dirname, 'dialer-app', 'server');
const CLIENT_PATH = path.join(__dirname, 'dialer-app', 'client');
const INDEX_TS_PATH = path.join(SERVER_PATH, 'src', 'index.ts');

console.log('🔍 Starting Crokodial diagnostic script...');

// Step 1: Check if node_modules are intact
function checkNodeModules() {
  console.log('\n📦 Checking node_modules...');
  
  // Server dependencies
  if (!fs.existsSync(path.join(SERVER_PATH, 'node_modules'))) {
    console.log('⚠️  Server node_modules not found. Installing server dependencies...');
    execSync('cd ' + SERVER_PATH + ' && npm install', { stdio: 'inherit' });
  } else {
    console.log('✅ Server node_modules exist');
  }
  
  // Client dependencies
  if (!fs.existsSync(path.join(CLIENT_PATH, 'node_modules', 'react-refresh'))) {
    console.log('⚠️  Client missing react-refresh dependency. Installing...');
    try {
      execSync('cd ' + CLIENT_PATH + ' && npm install react-refresh --save-dev', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to install react-refresh. Trying with force...');
      execSync('cd ' + CLIENT_PATH + ' && npm install react-refresh --save-dev --force', { stdio: 'inherit' });
    }
  } else {
    console.log('✅ Client react-refresh exists');
  }
}

// Step 2: Fix TypeScript errors in index.ts
function fixIndexTsErrors() {
  console.log('\n🔧 Fixing TypeScript errors in index.ts...');
  
  if (!fs.existsSync(INDEX_TS_PATH)) {
    console.error('❌ ERROR: index.ts not found at', INDEX_TS_PATH);
    return;
  }

  let content = fs.readFileSync(INDEX_TS_PATH, 'utf8');
  
  // Make a backup
  const backupPath = INDEX_TS_PATH + '.backup-' + Date.now();
  fs.writeFileSync(backupPath, content);
  console.log('✅ Created backup at', backupPath);
  
  // Fix 1: Route handler functions
  console.log('Fixing route handler functions...');
  
  // Fix /api/auth/gmail/callback route
  content = content.replace(
    /app\.get\('\/api\/auth\/gmail\/callback', async \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {/,
    "app.get('/api/auth/gmail/callback', (req: express.Request, res: express.Response, next: express.NextFunction) => {"
  );
  
  // Fix /api/import-csv-direct route
  content = content.replace(
    /app\.post\('\/api\/import-csv-direct', upload\.single\('file'\), async function\(req: express\.Request, res: express\.Response, next: express\.NextFunction\) {/,
    "app.post('/api/import-csv-direct', upload.single('file'), (req: express.Request, res: express.Response, next: express.NextFunction) => {"
  );
  
  // Fix /api/webhooks/nextgen route
  content = content.replace(
    /app\.post\('\/api\/webhooks\/nextgen', async \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {/,
    "app.post('/api/webhooks/nextgen', (req: express.Request, res: express.Response, next: express.NextFunction) => {"
  );
  
  // Add async wrapper functions for all handlers
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

  content = content.replace(
    /app\.post\('\/api\/import-csv-direct', upload\.single\('file'\), \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {[\s\S]*?try {/,
    `app.post('/api/import-csv-direct', upload.single('file'), (req: express.Request, res: express.Response, next: express.NextFunction) => {
  (async () => {
    try {`
  );

  content = content.replace(
    /app\.post\('\/api\/webhooks\/nextgen', \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {[\s\S]*?try {/,
    `app.post('/api/webhooks/nextgen', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  (async () => {
    try {`
  );

  // Close the async functions at the end of each handler
  content = content.replace(/}\) catch \(error\) {[\s\S]*?res\.status\(500\)\.json\(\{[\s\S]*?}\);[\s\S]*?}\);/g, match => {
    return match + "\n  })();";
  });

  // Write the fixed content
  fs.writeFileSync(INDEX_TS_PATH, content);
  console.log('✅ Fixed TypeScript errors in index.ts');
}

// Step 3: Check and restart the server
function restartServer() {
  console.log('\n🔄 Restarting the server...');
  
  // Kill any existing process on port 3001
  try {
    console.log('Killing any process using port 3001...');
    execSync('kill $(lsof -ti :3001) 2>/dev/null || true');
  } catch (error) {
    // Ignore errors here
  }
  
  // Start the server in background
  console.log('Starting the server...');
  execSync('cd ' + SERVER_PATH + ' && npm start &', { stdio: 'inherit' });
  
  console.log('✅ Server restarted');
}

// Main function
async function main() {
  try {
    checkNodeModules();
    fixIndexTsErrors();
    restartServer();
    
    console.log('\n🎉 Diagnostic and fix process completed successfully!');
    console.log('Please check that the server is running without errors.');
    console.log('You may need to restart the client with:');
    console.log('cd ' + CLIENT_PATH + ' && npm run dev');
  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
}

main(); 