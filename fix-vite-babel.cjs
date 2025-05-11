#!/usr/bin/env node

/**
 * Fix Vite React Refresh Babel issue
 * 
 * This script fixes the common error:
 * "Cannot find module 'react-refresh/babel' imported from ..."
 * by creating the necessary symlink to the babel.js file.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLIENT_DIR = path.join(__dirname, 'dialer-app', 'client');
const NODE_MODULES_DIR = path.join(CLIENT_DIR, 'node_modules');
const REACT_REFRESH_DIR = path.join(NODE_MODULES_DIR, 'react-refresh');
const BABEL_JS_PATH = path.join(REACT_REFRESH_DIR, 'babel.js');
const BABEL_PATH = path.join(REACT_REFRESH_DIR, 'babel');

console.log('🔧 Starting Vite React Refresh Babel Fix...');

// Check if react-refresh directory exists
if (!fs.existsSync(REACT_REFRESH_DIR)) {
  console.error('❌ react-refresh module not found!');
  console.log('Installing react-refresh...');
  try {
    execSync(`cd "${CLIENT_DIR}" && npm install react-refresh --save-dev`, { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to install react-refresh:', error.message);
    process.exit(1);
  }
}

// Check if babel.js exists
if (!fs.existsSync(BABEL_JS_PATH)) {
  console.error('❌ babel.js file not found!');
  console.log('Creating babel.js file...');
  try {
    // Create a simple babel.js file if it doesn't exist
    fs.writeFileSync(BABEL_JS_PATH, `
'use strict';

const refreshBabel = require('./cjs/react-refresh-babel.development.js');
module.exports = refreshBabel;
`);
    console.log('✅ Created babel.js file');
  } catch (error) {
    console.error('❌ Failed to create babel.js file:', error.message);
    process.exit(1);
  }
}

// Create symlink from babel to babel.js if needed
if (!fs.existsSync(BABEL_PATH)) {
  console.log('Creating symlink from babel to babel.js...');
  try {
    // Use relative path for cross-platform compatibility
    fs.symlinkSync('./babel.js', BABEL_PATH);
    console.log('✅ Created symlink from babel to babel.js');
  } catch (error) {
    console.error('❌ Failed to create symlink:', error.message);
    // Try alternative approach if symlink fails
    try {
      console.log('Trying alternative approach...');
      fs.copyFileSync(BABEL_JS_PATH, BABEL_PATH);
      console.log('✅ Copied babel.js to babel instead of creating symlink');
    } catch (copyError) {
      console.error('❌ Failed to copy file:', copyError.message);
      process.exit(1);
    }
  }
} else {
  console.log('✅ babel file already exists');
}

console.log('\n✅ Vite React Refresh Babel Fix completed!');
console.log('\nNext steps:');
console.log('1. Try running the client with: cd dialer-app/client && npm run dev');
console.log('2. If still having issues, check the vite.config.ts for proper configuration'); 