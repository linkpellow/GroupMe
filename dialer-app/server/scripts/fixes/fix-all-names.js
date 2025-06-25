#!/usr/bin/env node

/**
 * Script to fix all name-related issues in the leads database
 * This is a comprehensive fix for various name field issues:
 * - Bid type values in name fields
 * - Names in wrong fields
 * - Phone numbers in name fields
 * - Names in phone fields
 *
 * Usage: node fix-all-names.js
 */

require("ts-node/register");
require("./src/scripts/fix-all-names.ts");
