#!/usr/bin/env node

/**
 * Fix Auth Routes TypeScript Errors for Crokodial
 * 
 * This script specifically fixes the TypeScript errors in the auth routes
 * that are causing the server to crash and resulting in white screen issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERVER_DIR = path.join(__dirname, 'dialer-app', 'server');
const AUTH_ROUTES_PATH = path.join(SERVER_DIR, 'src', 'routes', 'auth.routes.ts');
const AUTH_CONTROLLER_PATH = path.join(SERVER_DIR, 'src', 'controllers', 'auth.controller.ts');

console.log('🔧 Starting Auth Routes Fix...');

// Fix Auth Routes TypeScript errors
function fixAuthRoutes() {
  console.log('\n🔍 Examining auth routes...');
  
  if (!fs.existsSync(AUTH_ROUTES_PATH)) {
    console.error('❌ Auth routes file not found!');
    return false;
  }
  
  // Create a backup
  const backupPath = `${AUTH_ROUTES_PATH}.backup-${Date.now()}`;
  fs.copyFileSync(AUTH_ROUTES_PATH, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  let content = fs.readFileSync(AUTH_ROUTES_PATH, 'utf8');
  
  // Fix 1: Use wrapper function approach to fix TypeScript errors
  console.log('🔧 Fixing route handler TypeScript errors...');
  
  // Update route handlers to use wrapper functions
  const updatedContent = content.replace(
    /(router\.(get|post|put|delete)\(['"](\/[^'"]*)['"](,\s*([a-zA-Z0-9_]+))?(,\s*([a-zA-Z0-9_]+))?\s*,\s*)([a-zA-Z0-9_]+)(\);)/g,
    (match, routePrefix, method, path, middleware1, middleware1Name, middleware2, middleware2Name, handlerName, closing) => {
      // Skip if it's a middleware reference like auth, loginValidation, etc.
      if (['auth', 'loginValidation', 'registerValidation', 'updateProfileValidation'].includes(handlerName)) {
        return match;
      }
      
      // Otherwise, wrap the handler to fix TypeScript errors
      return `${routePrefix}(req, res, next) => { ${handlerName}(req, res, next).catch(next); }${closing}`;
    }
  );
  
  if (content !== updatedContent) {
    fs.writeFileSync(AUTH_ROUTES_PATH, updatedContent);
    console.log('✅ Auth routes fixed');
  } else {
    console.log('ℹ️ No changes needed for auth routes');
  }
  
  return true;
}

// Fix Auth Controller if needed
function fixAuthController() {
  console.log('\n🔍 Examining auth controller...');
  
  if (!fs.existsSync(AUTH_CONTROLLER_PATH)) {
    console.log('⚠️ Auth controller file not found, skipping...');
    return false;
  }
  
  // Create a backup
  const backupPath = `${AUTH_CONTROLLER_PATH}.backup-${Date.now()}`;
  fs.copyFileSync(AUTH_CONTROLLER_PATH, backupPath);
  console.log(`✅ Created backup at ${backupPath}`);
  
  let content = fs.readFileSync(AUTH_CONTROLLER_PATH, 'utf8');
  let updated = false;
  
  // Check if we need to fix the controller exports
  if (!content.includes('export const register = async (req: Request, res: Response, next: NextFunction)')) {
    // Add NextFunction parameter to all route handler functions
    content = content.replace(
      /export const ([a-zA-Z0-9_]+) = async \(req: Request, res: Response\)/g,
      'export const $1 = async (req: Request, res: Response, next: NextFunction)'
    );
    updated = true;
  }
  
  // Add error handling to functions that don't have it
  if (!content.includes('catch (error)')) {
    // Add try/catch blocks to functions that don't have them
    content = content.replace(
      /(export const [a-zA-Z0-9_]+ = async \(req: Request, res: Response(?:, next: NextFunction)?\) => {(?!\s*try {))/g,
      '$1\n  try {'
    ).replace(
      /(return res\.(?:status\(\d+\)\.)?(?:json|send)\([^;]+\);)(?!\s*} catch)/g,
      '$1\n  } catch (error) {\n    next(error);\n  }'
    );
    updated = true;
  }
  
  if (updated) {
    // Add NextFunction import if not present
    if (!content.includes('NextFunction')) {
      content = content.replace(
        /import { Request, Response } from 'express';/,
        'import { Request, Response, NextFunction } from \'express\';'
      );
    }
    
    // Write the updated file
    fs.writeFileSync(AUTH_CONTROLLER_PATH, content);
    console.log('✅ Auth controller fixed');
  } else {
    console.log('ℹ️ No changes needed for auth controller');
  }
  
  return true;
}

// Restart the server
function restartServer() {
  console.log('\n🔄 Restarting the server...');
  
  try {
    // Kill existing server
    execSync('kill $(lsof -ti :3001) 2>/dev/null || true');
    
    // Start server in the background
    execSync(`cd ${SERVER_DIR} && npm start &`, { stdio: 'inherit' });
    
    console.log('✅ Server restarted');
    return true;
  } catch (error) {
    console.error('❌ Error restarting server:', error.message);
    return false;
  }
}

// Main function
async function main() {
  try {
    // Fix auth routes
    const routesFixed = fixAuthRoutes();
    if (!routesFixed) {
      console.error('❌ Failed to fix auth routes');
      return;
    }
    
    // Fix auth controller
    const controllerFixed = fixAuthController();
    
    // Restart server
    restartServer();
    
    console.log('\n✅ Auth routes fix completed!');
    console.log('\nNext steps:');
    console.log('1. Check that the server is running without TypeScript errors');
    console.log('2. Try using the login functionality at http://localhost:5173');
    console.log('3. If still having issues, run the build-mode-fix.js script for a more comprehensive fix');
  } catch (error) {
    console.error('\n❌ An error occurred:', error);
  }
}

// Run the main function
main(); 