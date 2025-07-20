#!/bin/bash

# NextGen Lead Notification Test Script
# Simple cURL version - much easier to use!

echo "🧪 NextGen Lead Notification Test"
echo "=================================="

# Default credentials
SID="crk_c615dc7de53e9a5dbf4ece635ad894f1"
API_KEY="key_03a8c03fa7b634848bcb260e1a8d12849f9fe1965eefc7de7dc4221c746191da"

# Server URL (default to production)
SERVER_URL=${1:-"https://crokodial-2a1145cec713.herokuapp.com"}

# Test lead data
TIMESTAMP=$(date +%s)
TEST_DATA='{
  "lead_id": "test_'$TIMESTAMP'",
  "nextgen_id": "ng_'$TIMESTAMP'",
  "first_name": "Afshin",
  "last_name": "Hasankhani",
  "email": "afshin.test@example.com",
  "phone": "555-123-4567",
  "city": "Miami",
  "state": "FL",
  "zip_code": "33101",
  "street_address": "123 Test Street",
  "dob": "01/15/1985",
  "age": 39,
  "gender": "Male",
  "height": "70",
  "weight": "180 lbs",
  "tobacco_user": false,
  "pregnant": false,
  "has_prescription": true,
  "has_medicare_parts_ab": false,
  "has_medical_condition": false,
  "household_size": "3",
  "household_income": "75000",
  "campaign_name": "Test Campaign",
  "product": "Health Insurance",
  "vendor_name": "Test Vendor",
  "account_name": "Test Account",
  "bid_type": "CPA",
  "price": "125.00",
  "source_hash": "test_source_hash_'$TIMESTAMP'",
  "sub_id_hash": "test_sub_id_'$TIMESTAMP'"
}'

echo "🚀 Sending test lead to: $SERVER_URL"
echo "👤 Test Lead: Afshin Hasankhani"
echo "⏰ Timestamp: $(date)"
echo ""
echo "📤 Sending request..."

# Send the webhook
curl -X POST "$SERVER_URL/api/webhooks/nextgen" \
  -H "Content-Type: application/json" \
  -H "sid: $SID" \
  -H "apikey: $API_KEY" \
  -H "User-Agent: NextGen-Test-Script/1.0" \
  -d "$TEST_DATA" \
  -w "\n\n📊 Response Status: %{http_code}\n⏱️  Response Time: %{time_total}s\n" \
  -s

echo ""
echo "✅ Request sent successfully!"
echo ""
echo "🎯 Expected Results:"
echo "- In-app notification banner should appear with:"
echo "  • Line 1: 'New NextGen Lead!'"
echo "  • Line 2: 'Afshin Hasankhani' (prominent display)"
echo "- Desktop notification should appear (if permissions granted)"
echo "- Notification sound should play (if enabled)"
echo ""
echo "💡 Tip: Open $SERVER_URL in your browser to see the notification!" 