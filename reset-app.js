#!/usr/bin/env node

/**
 * Reset script for Crokodial CRM
 * 
 * This script:
 * 1. Kills running servers
 * 2. Removes server build files
 * 3. Removes client vite cache
 * 4. Rebuilds server
 * 5. Starts server and client
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧹 Resetting Crokodial CRM...');

// Kill running processes
console.log('Killing running processes...');
try {
  execSync('kill $(lsof -ti :3001) 2>/dev/null || true');
  execSync('kill $(lsof -ti :5173) 2>/dev/null || true');
  console.log('✅ Processes killed');
} catch (e) {
  // Ignore errors
}

// Clear server build
console.log('Cleaning server build...');
try {
  execSync('cd dialer-app/server && rm -rf dist');
  console.log('✅ Server build cleaned');
} catch (e) {
  console.error('❌ Error cleaning server build:', e.message);
}

// Clear client cache
console.log('Cleaning client cache...');
try {
  execSync('cd dialer-app/client && rm -rf node_modules/.vite');
  console.log('✅ Client cache cleaned');
} catch (e) {
  console.error('❌ Error cleaning client cache:', e.message);
}

// Rebuild server
console.log('Rebuilding server...');
try {
  execSync('cd dialer-app/server && npm run build', { stdio: 'inherit' });
  console.log('✅ Server rebuilt');
} catch (e) {
  console.error('❌ Error rebuilding server:', e.message);
  process.exit(1);
}

// Start server
console.log('Starting server...');
try {
  execSync('cd dialer-app/server && npm start &', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Error starting server:', e.message);
}

// Start client
console.log('Starting client...');
try {
  execSync('cd dialer-app/client && npm run dev &', { stdio: 'inherit' });
} catch (e) {
  console.error('❌ Error starting client:', e.message);
}

console.log('✅ Reset complete! The application should be running at:');
console.log('- Client: http://localhost:5173');
console.log('- Server: http://localhost:3001');
console.log('Note: You may need to clear your browser cache and localStorage for the changes to take effect.'); 