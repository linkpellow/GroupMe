#!/usr/bin/env node

/**
 * Fix Client Errors Script for Crokodial
 * 
 * This script will:
 * 1. Fix the react-refresh dependency issues
 * 2. Restart the client development server
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLIENT_PATH = path.join(__dirname, 'dialer-app', 'client');
const VITE_CONFIG_PATH = path.join(CLIENT_PATH, 'vite.config.ts');

console.log('🔍 Starting Crokodial client fix script...');

// Step 1: Install missing dependencies
function fixDependencies() {
  console.log('\n📦 Fixing client dependencies...');
  
  try {
    // Install react-refresh and related dependencies
    console.log('Installing react-refresh...');
    execSync('cd ' + CLIENT_PATH + ' && npm install react-refresh@0.14.0 --save-dev --force', { stdio: 'inherit' });
    
    // Ensure other essential dependencies are installed
    console.log('Installing @vitejs/plugin-react...');
    execSync('cd ' + CLIENT_PATH + ' && npm install @vitejs/plugin-react@latest --save-dev --force', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    console.log('Trying alternative approach...');
    
    // If installation fails, let's try cleaning node_modules and package-lock.json
    try {
      console.log('Cleaning npm cache...');
      execSync('cd ' + CLIENT_PATH + ' && npm cache clean --force', { stdio: 'inherit' });
      
      console.log('Installing all dependencies from scratch...');
      execSync('cd ' + CLIENT_PATH + ' && npm install --force', { stdio: 'inherit' });
      
      console.log('✅ Dependencies reinstalled successfully');
    } catch (reinstallError) {
      console.error('❌ Failed to reinstall dependencies:', reinstallError.message);
      throw new Error('Could not fix dependencies');
    }
  }
}

// Step 2: Update Vite config if needed
function updateViteConfig() {
  console.log('\n🔧 Checking Vite configuration...');
  
  if (!fs.existsSync(VITE_CONFIG_PATH)) {
    console.error('❌ ERROR: vite.config.ts not found at', VITE_CONFIG_PATH);
    return;
  }

  let content = fs.readFileSync(VITE_CONFIG_PATH, 'utf8');
  
  // Make a backup
  const backupPath = VITE_CONFIG_PATH + '.backup-' + Date.now();
  fs.writeFileSync(backupPath, content);
  console.log('✅ Created backup at', backupPath);
  
  // Check if we need to modify the react plugin configuration
  if (content.includes('react-refresh/babel') && !content.includes('react-refresh/babel.js')) {
    console.log('Updating react plugin configuration...');
    
    // Update the react plugin import configuration to use babel.js instead
    content = content.replace(
      /import react from ['"]@vitejs\/plugin-react['"];/,
      `import react from '@vitejs/plugin-react';`
    );
    
    // Modify the plugin configuration to avoid using babel directly
    content = content.replace(
      /react\(\{[^}]*\}\)/,
      `react({ 
  // Disable fast refresh during development to avoid babel issues
  fastRefresh: false
})`
    );
    
    // Write the updated configuration
    fs.writeFileSync(VITE_CONFIG_PATH, content);
    console.log('✅ Updated Vite configuration');
  } else {
    console.log('✅ Vite configuration looks good');
  }
}

// Step 3: Restart the client development server
function restartClient() {
  console.log('\n🔄 Restarting the client development server...');
  
  // Kill any existing process on port 5173
  try {
    console.log('Killing any process using port 5173...');
    execSync('kill $(lsof -ti :5173) 2>/dev/null || true');
  } catch (error) {
    // Ignore errors here
  }
  
  // Start the client in background
  console.log('Starting the client server...');
  execSync('cd ' + CLIENT_PATH + ' && npm run dev &', { stdio: 'inherit' });
  
  console.log('✅ Client server restarted');
}

// Main function
async function main() {
  try {
    fixDependencies();
    updateViteConfig();
    restartClient();
    
    console.log('\n🎉 Client fix process completed successfully!');
    console.log('Please check that the client is running without errors at http://localhost:5173');
  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
}

main(); 