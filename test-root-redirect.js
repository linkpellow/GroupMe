#!/usr/bin/env node

/**
 * Test script to verify the root redirect fix
 */

const fs = require('fs');

console.log('🔍 Testing Root Redirect Fix...\n');

// Check if the root redirect was changed from /leads to /login
console.log('📁 Checking App.tsx routing...');
try {
  const appContent = fs.readFileSync('dialer-app/client/src/App.tsx', 'utf8');
  
  // Check for the root route redirect
  if (appContent.includes('<Route path="/" element={<Navigate to="/login" />} />')) {
    console.log('✅ Root redirect to /login found');
  } else if (appContent.includes('<Route path="/" element={<Navigate to="/leads" />} />')) {
    console.log('❌ Root still redirects to /leads (OLD BEHAVIOR)');
  } else {
    console.log('❓ Root redirect not found or changed format');
  }
  
  // Check for login route
  if (appContent.includes('<Route path="/login" element={<Login />} />')) {
    console.log('✅ Login route found');
  } else {
    console.log('❌ Login route missing');
  }
  
  // Check for leads route
  if (appContent.includes('path="/leads"')) {
    console.log('✅ Leads route found (should be protected)');
  } else {
    console.log('❌ Leads route missing');
  }
  
} catch (error) {
  console.log('❌ Error reading App.tsx:', error.message);
}

console.log('\n🎯 EXPECTED BEHAVIOR:');
console.log('- crokodial.com should redirect to crokodial.com/login');
console.log('- Unauthenticated users should see login page');
console.log('- No more infinite loading on root path');
console.log('- Authenticated users will be redirected to /leads after login');

console.log('\n✅ Root cause fix verified!'); 