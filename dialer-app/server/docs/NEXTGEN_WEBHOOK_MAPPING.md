# NextGen Webhook Field Mapping

## Overview
This document describes how NextGen webhook data is mapped to our Lead schema.

## Source Code Mapping
As of 2025-07-19, NextGen leads now correctly map campaign information to the `sourceCode` field.

### Priority Order
The system uses the following priority order for source code:
1. `campaign_name` - The marketing campaign that generated the lead (e.g., "Health Insurance Q3")
2. `vendor_name` - The vendor/partner name if campaign is missing (e.g., "NextGen Leads")
3. `"NextGen"` - Fallback if both are missing

### Example
```json
// NextGen sends:
{
  "campaign_name": "Health Insurance Q3",
  "vendor_name": "NextGen Leads",
  "account_name": "Health Direct"
}

// We store:
{
  "source": "NextGen",
  "sourceCode": "Health Insurance Q3"
}
```

## Complete Field Mapping

| NextGen Field | Our Field | Notes |
|--------------|-----------|--------|
| `lead_id` or `nextgen_id` | `nextgenId` | Unique identifier from NextGen |
| `first_name` | `firstName` | |
| `last_name` | `lastName` | |
| `first_name + last_name` | `name` | Combined full name |
| `email` | `email` | |
| `phone` or `phone_number` | `phone` | |
| `city` | `city` | Trimmed |
| `state` | `state` | Uppercase, trimmed |
| `zip_code` | `zipcode` | Trimmed |
| `street_address` | `street1` | Trimmed |
| `dob` or `date_of_birth` | `dob` | Date string |
| `gender` | `gender` | "Male" or "Female" |
| `height` | `height` | Converted from inches to feet/inches format |
| `weight` | `weight` | String as-is |
| `campaign_name` | `sourceCode` | **Primary source tracking** |
| `vendor_name` | `vendorName` | Stored separately |
| `account_name` | `accountName` | |
| `price` | `price` | Parsed as float |
| `purchase_date` | `createdAt` | If provided in payload |
| (hardcoded) | `source` | Always "NextGen" |
| (hardcoded) | `disposition` | Always "New Lead" |
| (hardcoded) | `status` | Always "New" |

## Historical Data Migration
For leads imported before 2025-07-19:
- Run migration script: `npm run migrate:fix-nextgen-sourcecodes`
- The script attempts to extract campaign info from notes
- Updates `sourceCode` field for better tracking

## Logging
The webhook handler logs:
- Lead ID
- NextGen ID  
- Source code assigned
- Raw campaign name
- Processing time

## Testing
Test the webhook mapping:
```bash
cd dialer-app/server
npm run test:nextgen-sourcecode
``` 