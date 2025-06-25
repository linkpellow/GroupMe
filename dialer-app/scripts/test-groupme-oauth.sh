#!/bin/bash

# Test script for GroupMe OAuth endpoints
# This verifies that OAuth endpoints work without authentication

echo "🧪 Testing GroupMe OAuth Endpoints..."
echo "====================================="

BASE_URL="http://localhost:3001/api/groupme"

# Test 1: Check connection status (should work without auth)
echo -e "\n1️⃣ Testing OAuth Status Endpoint (no auth)..."
curl -s -X GET "$BASE_URL/oauth/status" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed to get status"

# Test 2: Initiate OAuth (should require auth but return appropriate error)
echo -e "\n2️⃣ Testing OAuth Initiate Endpoint (no auth)..."
curl -s -X POST "$BASE_URL/oauth/initiate" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed to initiate OAuth"

# Test 3: Test with a fake auth token (should work for status)
echo -e "\n3️⃣ Testing OAuth Status with fake auth..."
curl -s -X GET "$BASE_URL/oauth/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token-12345" | jq '.' || echo "Failed with auth"

# Test 4: Test regular config endpoint (should require auth)
echo -e "\n4️⃣ Testing Config Endpoint (requires auth)..."
curl -s -X GET "$BASE_URL/config" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed to get config"

echo -e "\n✅ OAuth endpoint tests complete!"
echo "Expected results:"
echo "- Status endpoint: Should return {connected: false} without auth"
echo "- Initiate endpoint: Should return 'Please log in' error"
echo "- Config endpoint: Should return 401 unauthorized" 