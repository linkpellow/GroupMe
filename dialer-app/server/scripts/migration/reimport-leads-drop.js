#!/usr/bin/env node

/**
 * Script to completely reimport leads from CSV files correctly
 * This script:
 * 1. Drops the entire leads collection
 * 2. Creates a new collection without email uniqueness constraint
 * 3. Imports leads from the CSV files with proper formatting
 * 4. Skips any leads with "exclusive" in their name
 *
 * Usage: node reimport-leads-drop.js
 */

require("ts-node/register");
require("./src/scripts/reimport-leads-drop.ts");
