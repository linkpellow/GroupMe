#!/usr/bin/env node

/**
 * Script to fix name fields in leads - Phase 2
 * This script handles moving last names from phone fields to proper name fields
 * and attempts to recover actual phone numbers from notes
 *
 * Usage: node fix-names-step2.js
 */

require("ts-node/register");
require("./src/scripts/fix-names-step2.ts");
