# Webhook Setup Instructions

This document provides instructions for setting up webhooks to receive leads from various sources.

## Available Webhook Endpoints

Your application has the following webhook endpoints available:

1. **Usha Marketplace Webhook**

   - URL: `https://crokodial-2a1145cec713.herokuapp.com/api/webhooks/usha`
   - Method: POST
   - Content-Type: application/json

2. **GRF NextGen Leads Webhook**

   - URL: `https://crokodial-2a1145cec713.herokuapp.com/api/webhooks/grf-nextgen`
   - Method: POST
   - Content-Type: application/json

3. **NGL NextGen Leads Webhook**

   - URL: `https://crokodial-2a1145cec713.herokuapp.com/api/webhooks/ngl-nextgen`
   - Method: POST
   - Content-Type: application/json

4. **Generic Webhook** (can be used for any source)
   - URL: `https://crokodial-2a1145cec713.herokuapp.com/api/webhooks/generic?source=SourceName`
   - Method: POST
   - Content-Type: application/json
   - Query Parameter: `source` (optional, to specify the lead source)

## Setup Instructions

### For Usha Marketplace

1. Log in to your Usha Marketplace account at https://app.ushamarketplace.com/leads
2. Navigate to Settings or Integration section
3. Look for Webhook or API Integration settings
4. Enter the webhook URL: `https://crokodial-2a1145cec713.herokuapp.com/api/webhooks/usha`
5. Save your settings

### For GRF NextGen Leads

1. Log in to your GRF NextGen account at https://grf.nextgenleads.app/purchases
2. Navigate to Settings or Integration section
3. Look for Webhook or API Integration settings
4. Enter the webhook URL: `https://crokodial-2a1145cec713.herokuapp.com/api/webhooks/grf-nextgen`
5. Save your settings

### For NGL NextGen Leads

1. Log in to your NGL NextGen account at https://ngl.nextgenleads.app/purchases
2. Navigate to Settings or Integration section
3. Look for Webhook or API Integration settings
4. Enter the webhook URL: `https://crokodial-2a1145cec713.herokuapp.com/api/webhooks/ngl-nextgen`
5. Save your settings

## Testing Your Webhooks

You can test your webhook setup by sending a test lead to each endpoint. Here's an example using curl:

```bash
curl -X POST https://crokodial-2a1145cec713.herokuapp.com/api/webhooks/usha \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","phone":"555-123-4567","email":"test@example.com"}'
```

## Troubleshooting

If you're having issues with the webhooks:

1. Check that you've entered the correct webhook URL
2. Ensure your lead provider supports webhook integrations
3. Verify that the data being sent matches the expected format
4. Check the application logs for any errors

For additional help, please contact support.
