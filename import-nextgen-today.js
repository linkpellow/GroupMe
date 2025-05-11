#!/usr/bin/env node

/**
 * Script to import recent NextGen leads
 * 
 * This tool will scan the csv directory for any NextGen lead files
 * and import them into the CRM as fresh leads.
 * 
 * Usage: node import-nextgen-today.js
 */

require('ts-node/register');
require('./src/scripts/import-nextgen-today.ts'); 