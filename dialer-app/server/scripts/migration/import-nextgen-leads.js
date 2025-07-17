#!/usr/bin/env node

/**
 * Script to import leads from NextGen webhook data
 * This script processes leads that were received via webhook
 * and formats their data properly in the lead list
 *
 * Usage: node import-nextgen-leads.js
 */

require("ts-node/register");
require("./src/scripts/import-nextgen-webhook-leads.ts");
