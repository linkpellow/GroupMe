#!/usr/bin/env node

/**
 * Script to fix the order field for all leads assigned to the admin user
 * This ensures leads appear in the correct order in the lead list
 *
 * Usage: node fix-lead-orders.js
 */

require("ts-node/register");
require("./src/scripts/fix-lead-orders.ts");
