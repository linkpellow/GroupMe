#!/usr/bin/env node

/**
 * Comprehensive Fix Script for Crokodial
 * 
 * This script will:
 * 1. Fix server TypeScript errors
 * 2. Fix client dependencies and configuration issues
 * 3. Restart both servers
 */

const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Crokodial comprehensive fix script...');
console.log('This script will fix both server and client issues.');

try {
  console.log('\n🔧 Step 1: Fixing server issues...');
  execSync('node ' + path.join(__dirname, 'fix-server-errors.js'), { stdio: 'inherit' });
  
  console.log('\n🔧 Step 2: Fixing client issues...');
  execSync('node ' + path.join(__dirname, 'fix-client-errors.js'), { stdio: 'inherit' });
  
  console.log('\n✅ All fixes have been applied!');
  console.log('The application should now be running correctly at:');
  console.log('- Client: http://localhost:5173');
  console.log('- Server: http://localhost:3001');
  console.log('\nIf you encounter any issues, please try:');
  console.log('1. Clearing your browser cache');
  console.log('2. Running `cd dialer-app/client && npm install --force`');
  console.log('3. Running `cd dialer-app/server && npm install --force`');
} catch (error) {
  console.error('\n❌ An error occurred during the fix process:', error);
  console.log('\nPlease try running each fix script separately:');
  console.log('./fix-server-errors.js');
  console.log('./fix-client-errors.js');
} 