#!/usr/bin/env node

/**
 * Script to remove duplicate leads from the database
 * This script:
 * 1. Identifies duplicate leads based on name and phone number
 * 2. Keeps only one copy of each unique lead
 * 3. Deletes all duplicates
 *
 * Usage: node remove-duplicate-leads.js
 */

require("ts-node/register");
require("./src/scripts/remove-duplicate-leads.ts");
