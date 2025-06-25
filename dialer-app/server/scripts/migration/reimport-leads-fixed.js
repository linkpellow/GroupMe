#!/usr/bin/env node

/**
 * Script to reimport all leads from CSV files correctly
 * This script:
 * 1. Bypasses Mongoose validation to avoid email uniqueness constraints
 * 2. Imports leads from the CSV files with proper formatting
 * 3. Skips any leads with "exclusive" in their name
 *
 * Usage: node reimport-leads-fixed.js
 */

require("ts-node/register");
require("./src/scripts/reimport-leads-fixed.ts");
