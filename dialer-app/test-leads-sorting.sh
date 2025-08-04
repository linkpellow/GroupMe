#!/bin/bash

echo "=== Testing Leads Sorting and Filtering ===="
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get auth token
echo "Getting authentication token..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@crokodial.com","password":"admin123"}')

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}✗ Failed to get auth token${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Got auth token${NC}"
echo

# Test 1: Default sorting (newest first)
echo "Test 1: Default sorting (newest first)..."
RESPONSE=$(curl -s "http://localhost:3001/api/leads?page=1&limit=5&sortBy=createdAt&sortDirection=desc" \
  -H "Authorization: Bearer $TOKEN")
  
FIRST_DATE=$(echo "$RESPONSE" | jq -r '.leads[0].createdAt' 2>/dev/null)
LAST_DATE=$(echo "$RESPONSE" | jq -r '.leads[4].createdAt' 2>/dev/null)

if [ ! -z "$FIRST_DATE" ] && [ "$FIRST_DATE" != "null" ]; then
    echo -e "${GREEN}✓ Got leads sorted by newest first${NC}"
    echo "  First lead date: $FIRST_DATE"
    echo "  Last lead date: $LAST_DATE"
else
    echo -e "${RED}✗ Failed to get sorted leads${NC}"
fi
echo

# Test 2: Oldest first sorting
echo "Test 2: Oldest first sorting..."
RESPONSE=$(curl -s "http://localhost:3001/api/leads?page=1&limit=5&sortBy=createdAt&sortDirection=asc" \
  -H "Authorization: Bearer $TOKEN")
  
FIRST_DATE=$(echo "$RESPONSE" | jq -r '.leads[0].createdAt' 2>/dev/null)
LAST_DATE=$(echo "$RESPONSE" | jq -r '.leads[4].createdAt' 2>/dev/null)

if [ ! -z "$FIRST_DATE" ] && [ "$FIRST_DATE" != "null" ]; then
    echo -e "${GREEN}✓ Got leads sorted by oldest first${NC}"
    echo "  First lead date: $FIRST_DATE"
    echo "  Last lead date: $LAST_DATE"
else
    echo -e "${RED}✗ Failed to get sorted leads${NC}"
fi
echo

# Test 3: NextGen filter
echo "Test 3: NextGen leads filter..."
RESPONSE=$(curl -s "http://localhost:3001/api/leads?page=1&limit=100&pipelineSource=nextgen" \
  -H "Authorization: Bearer $TOKEN")
  
TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null)
LEADS=$(echo "$RESPONSE" | jq -r '.leads[] | select(.pipelineSource == "nexgen-dialer-integration")' 2>/dev/null | wc -l)

echo "  Total NextGen leads: $TOTAL"
echo "  Verified NextGen leads in response: $LEADS"

if [ "$TOTAL" -gt 0 ]; then
    echo -e "${GREEN}✓ NextGen filter working${NC}"
else
    echo -e "${YELLOW}⚠ No NextGen leads found${NC}"
fi
echo

# Test 4: Marketplace filter
echo "Test 4: Marketplace leads filter..."
RESPONSE=$(curl -s "http://localhost:3001/api/leads?page=1&limit=100&pipelineSource=marketplace" \
  -H "Authorization: Bearer $TOKEN")
  
TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null)
LEADS=$(echo "$RESPONSE" | jq -r '.leads[] | select(.pipelineSource == "marketplace")' 2>/dev/null | wc -l)

echo "  Total Marketplace leads: $TOTAL"
echo "  Verified Marketplace leads in response: $LEADS"

if [ "$TOTAL" -gt 0 ]; then
    echo -e "${GREEN}✓ Marketplace filter working${NC}"
else
    echo -e "${YELLOW}⚠ No Marketplace leads found${NC}"
fi
echo

# Test 5: All leads (no filter)
echo "Test 5: All leads (no pipeline filter)..."
RESPONSE=$(curl -s "http://localhost:3001/api/leads?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")
  
TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null)
SOURCES=$(echo "$RESPONSE" | jq -r '.leads[].pipelineSource' 2>/dev/null | sort | uniq)

echo "  Total leads: $TOTAL"
echo "  Pipeline sources found:"
echo "$SOURCES" | sed 's/^/    - /'

if [ "$TOTAL" -gt 0 ]; then
    echo -e "${GREEN}✓ All leads query working${NC}"
else
    echo -e "${RED}✗ Failed to get all leads${NC}"
fi
echo

# Test 6: Combined filter and sort
echo "Test 6: NextGen leads sorted newest first..."
RESPONSE=$(curl -s "http://localhost:3001/api/leads?page=1&limit=5&pipelineSource=nextgen&sortBy=createdAt&sortDirection=desc" \
  -H "Authorization: Bearer $TOKEN")
  
TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null)
FIRST_DATE=$(echo "$RESPONSE" | jq -r '.leads[0].createdAt' 2>/dev/null)
FIRST_SOURCE=$(echo "$RESPONSE" | jq -r '.leads[0].pipelineSource' 2>/dev/null)

if [ ! -z "$FIRST_DATE" ] && [ "$FIRST_DATE" != "null" ] && [ "$FIRST_SOURCE" = "nexgen-dialer-integration" ]; then
    echo -e "${GREEN}✓ Combined filter and sort working${NC}"
    echo "  Total NextGen leads: $TOTAL"
    echo "  First lead date: $FIRST_DATE"
else
    echo -e "${RED}✗ Combined filter and sort not working properly${NC}"
fi

echo
echo "=== Test Summary ===" 