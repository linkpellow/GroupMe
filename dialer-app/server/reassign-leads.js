#!/usr/bin/env node

/**
 * Script to reassign all leads to the admin user
 * This ensures all leads are visible in the admin's lead list
 *
 * Usage: node reassign-leads.js
 */

require("ts-node/register");
require("./src/scripts/reassign-leads.ts");
