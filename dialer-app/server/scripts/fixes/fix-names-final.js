#!/usr/bin/env node

/**
 * Script to fix name and phone fields in leads - Final step
 * This script handles the final corrections needed to:
 * 1. Move last names from phone fields to proper name fields
 * 2. Recover actual phone numbers from notes where possible
 * 3. Properly format the full names
 *
 * Usage: node fix-names-final.js
 */

require("ts-node/register");
require("./src/scripts/fix-names-final.ts");
