#!/usr/bin/env node

/**
 * Script to delete leads with "exclusive" in their name field
 * These are duplicate leads with incorrect field ordering
 *
 * Usage: node delete-exclusive-leads.js
 */

require("ts-node/register");
require("./src/scripts/delete-exclusive-leads.ts");
