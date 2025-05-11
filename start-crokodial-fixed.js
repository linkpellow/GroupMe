#!/usr/bin/env node

/**
 * Crokodial Startup Script with Fixes
 * 
 * This script:
 * 1. Checks for and fixes common issues
 * 2. Starts the server with the fixed TypeScript code
 * 3. Starts the client with fixed dependencies
 * 4. Provides a clean UI in the terminal
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = __dirname;
const SERVER_DIR = path.join(ROOT_DIR, 'dialer-app', 'server');
const CLIENT_DIR = path.join(ROOT_DIR, 'dialer-app', 'client');

// Function to create a separator line
function separator(title = '') {
  const width = process.stdout.columns || 80;
  const line = '='.repeat(width);
  if (title) {
    const padding = Math.floor((width - title.length - 2) / 2);
    return '='.repeat(padding) + ' ' + title + ' ' + '='.repeat(padding);
  }
  return line;
}

// Print header
console.log('\n\n' + separator());
console.log(separator('CROKODIAL CRM STARTUP'));
console.log(separator());
console.log('\n🚀 Starting Crokodial CRM with automatic fixes...\n');

// Kill existing processes
function killExistingProcesses() {
  console.log('🔄 Cleaning up existing processes...');
  try {
    execSync('kill $(lsof -ti :3001) 2>/dev/null || true');
    execSync('kill $(lsof -ti :5173) 2>/dev/null || true');
    console.log('✅ Existing processes terminated');
  } catch (error) {
    // Ignore errors
  }
}

// Function to check MongoDB connection
function checkMongoDB() {
  console.log('🔍 Checking MongoDB connection...');
  try {
    execSync('mongosh --eval "db.version()" --quiet');
    console.log('✅ MongoDB is running');
    return true;
  } catch (error) {
    console.log('⚠️  MongoDB is not running. Attempting to start...');
    try {
      execSync('brew services start mongodb-community');
      console.log('✅ MongoDB started');
      return true;
    } catch (startError) {
      console.error('❌ Failed to start MongoDB. Please start it manually.');
      return false;
    }
  }
}

// Apply fixes to server code
function fixServerCode() {
  console.log('🔧 Checking server code...');
  
  const indexPath = path.join(SERVER_DIR, 'src', 'index.ts');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Server index.ts not found!');
    return false;
  }
  
  let content = fs.readFileSync(indexPath, 'utf8');
  let modified = false;
  
  // Check if Gmail callback route needs fixing
  if (content.includes("app.get('/api/auth/gmail/callback', async (req: express.Request, res: express.Response, next: express.NextFunction)")) {
    console.log('🔧 Fixing Gmail callback route...');
    content = content.replace(
      /app\.get\('\/api\/auth\/gmail\/callback', async \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {[\s\S]*?await gmailController\.handleOAuthCallback\(req, res\);/g,
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
    modified = true;
  }
  
  // Check if CSV import route needs fixing
  if (content.includes("app.post('/api/import-csv-direct', upload.single('file'), async function(req: express.Request, res: express.Response, next: express.NextFunction)")) {
    console.log('🔧 Fixing CSV import route...');
    content = content.replace(
      /app\.post\('\/api\/import-csv-direct', upload\.single\('file'\), async function\(req: express\.Request, res: express\.Response, next: express\.NextFunction\) {[\s\S]*?try {/,
      `app.post('/api/import-csv-direct', upload.single('file'), (req: express.Request, res: express.Response, next: express.NextFunction) => {
  (async () => {
    try {`
    );
    
    // Add closing async wrapper at the end of the function
    content = content.replace(
      /catch \(error\) {[\s\S]*?console\.error\('CSV import error:', error\);[\s\S]*?res\.status\(500\)\.json\({ error: 'Error importing CSV' }\);[\s\S]*?}\);/g,
      match => match + "\n  })();"
    );
    
    modified = true;
  }
  
  // Check if NextGen webhook route needs fixing
  if (content.includes("app.post('/api/webhooks/nextgen', async (req: express.Request, res: express.Response, next: express.NextFunction)")) {
    console.log('🔧 Fixing NextGen webhook route...');
    content = content.replace(
      /app\.post\('\/api\/webhooks\/nextgen', async \(req: express\.Request, res: express\.Response, next: express\.NextFunction\) => {[\s\S]*?try {/,
      `app.post('/api/webhooks/nextgen', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  (async () => {
    try {`
    );
    
    // Add closing async wrapper at the end of the function
    content = content.replace(
      /catch \(error\) {[\s\S]*?res\.status\(500\)\.json\({[\s\S]*?}\);[\s\S]*?}\);/g,
      match => match + "\n  })();"
    );
    
    modified = true;
  }
  
  if (modified) {
    // Create a backup
    fs.writeFileSync(indexPath + '.backup', content);
    fs.writeFileSync(indexPath, content);
    console.log('✅ Server code fixed');
  } else {
    console.log('✅ Server code looks good');
  }
  
  return true;
}

// Fix client configuration
function fixClientConfig() {
  console.log('🔧 Checking client configuration...');
  
  const viteConfigPath = path.join(CLIENT_DIR, 'vite.config.ts');
  if (!fs.existsSync(viteConfigPath)) {
    console.error('❌ Vite config not found!');
    return false;
  }
  
  let content = fs.readFileSync(viteConfigPath, 'utf8');
  let modified = false;
  
  // Check if HMR config needs to be added
  if (!content.includes('hmr:')) {
    console.log('🔧 Adding HMR configuration...');
    content = content.replace(
      /server: {[\s\S]*?}[\s\S]*?},/,
      match => {
        if (match.includes('hmr:')) return match;
        return match.replace(
          /},$/,
          `,
    hmr: {
      overlay: false
    }
  },`
        );
      }
    );
    modified = true;
  }
  
  // Add optimizeDeps if needed
  if (!content.includes('optimizeDeps:')) {
    console.log('🔧 Adding dependency optimization...');
    content = content.replace(
      /export default defineConfig\({[\s\S]*}\)/,
      match => {
        if (match.includes('optimizeDeps:')) return match;
        return match.replace(
          /}\)$/,
          `,
  optimizeDeps: {
    exclude: ['debug'],
    include: ['react', 'react-dom']
  }
})`
        );
      }
    );
    modified = true;
  }
  
  if (modified) {
    // Create a backup
    fs.writeFileSync(viteConfigPath + '.backup', content);
    fs.writeFileSync(viteConfigPath, content);
    console.log('✅ Client configuration fixed');
  } else {
    console.log('✅ Client configuration looks good');
  }
  
  // Check if react-refresh is installed
  try {
    const packageJsonPath = path.join(CLIENT_DIR, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.devDependencies['react-refresh']) {
      console.log('🔧 Installing react-refresh dependency...');
      try {
        execSync('cd ' + CLIENT_DIR + ' && npm install react-refresh@0.14.0 --save-dev --force', { stdio: 'inherit' });
        console.log('✅ react-refresh installed');
      } catch (error) {
        console.error('❌ Failed to install react-refresh');
      }
    }
  } catch (error) {
    console.error('❌ Error checking package.json:', error.message);
  }
  
  return true;
}

// Start server
function startServer() {
  console.log('\n' + separator('STARTING SERVER'));
  console.log('🚀 Starting server...');
  
  const serverProcess = spawn('npm', ['start'], { cwd: SERVER_DIR });
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[SERVER] ${output.trim()}`);
    
    // Check for successful startup
    if (output.includes('Successfully connected to MongoDB') || 
        output.includes('Server running on port')) {
      console.log('✅ Server started successfully');
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR] ${data.toString().trim()}`);
  });
  
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Server process exited with code ${code}`);
    }
  });
  
  return serverProcess;
}

// Start client
function startClient() {
  console.log('\n' + separator('STARTING CLIENT'));
  console.log('🚀 Starting client...');
  
  const clientProcess = spawn('npm', ['run', 'dev'], { cwd: CLIENT_DIR });
  
  clientProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[CLIENT] ${output.trim()}`);
    
    // Check for successful startup
    if (output.includes('Local:') || 
        output.includes('http://localhost')) {
      console.log('✅ Client started successfully');
      console.log('🌐 You can access the application at: http://localhost:5173');
    }
  });
  
  clientProcess.stderr.on('data', (data) => {
    console.error(`[CLIENT ERROR] ${data.toString().trim()}`);
    
    // Check for common errors and provide solutions
    const errorMsg = data.toString();
    if (errorMsg.includes('react-refresh/babel')) {
      console.log('\n⚠️  React refresh error detected. Trying to fix...');
      try {
        execSync('cd ' + CLIENT_DIR + ' && npm install react-refresh@0.14.0 --save-dev --force', { stdio: 'inherit' });
        console.log('✅ react-refresh reinstalled. Please restart the application.');
      } catch (error) {
        console.error('❌ Failed to fix react-refresh issue');
      }
    }
  });
  
  clientProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Client process exited with code ${code}`);
    }
  });
  
  return clientProcess;
}

// Main process
async function main() {
  try {
    // Cleanup existing processes
    killExistingProcesses();
    
    // Check MongoDB
    const mongoOk = checkMongoDB();
    if (!mongoOk) {
      console.log('⚠️  Continuing without MongoDB check. Server may fail to start.');
    }
    
    // Fix server code
    const serverFixed = fixServerCode();
    if (!serverFixed) {
      console.error('❌ Failed to fix server code');
      return;
    }
    
    // Fix client config
    const clientFixed = fixClientConfig();
    if (!clientFixed) {
      console.error('❌ Failed to fix client config');
      return;
    }
    
    // Start the server
    const serverProcess = startServer();
    
    // Give server time to start before client
    console.log('⏳ Waiting for server to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Start the client
    const clientProcess = startClient();
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n' + separator('SHUTTING DOWN'));
      console.log('🛑 Shutting down Crokodial...');
      serverProcess.kill();
      clientProcess.kill();
      process.exit(0);
    });
    
    console.log('\n' + separator('STARTUP COMPLETE'));
    console.log('✅ Crokodial is now running!');
    console.log('🌐 Access the application at: http://localhost:5173');
    console.log('📋 Press Ctrl+C to stop all processes');
    console.log(separator());
    
  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
}

// Run the main process
main(); 