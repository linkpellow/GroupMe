#!/usr/bin/env node

/**
 * Script to check all leads in the database
 * This will show any remaining leads with "exclusive" in their fields
 * and display all leads currently in the database
 *
 * Usage: node check-leads.js
 */

require("ts-node/register");
require("./src/scripts/check-leads.ts");
