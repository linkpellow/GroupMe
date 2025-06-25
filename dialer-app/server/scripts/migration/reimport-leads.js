#!/usr/bin/env node

/**
 * Script to reimport all leads from CSV files correctly
 * This script:
 * 1. Clears the existing leads
 * 2. Imports leads from the CSV files with proper formatting
 * 3. Does not add any "exclusive" text to the name fields
 *
 * Usage: node reimport-leads.js
 */

require("ts-node/register");
require("./src/scripts/reimport-leads.ts");
