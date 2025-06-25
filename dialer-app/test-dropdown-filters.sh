#!/bin/bash

# Test script for dropdown filters
echo "=== Testing Leads API Dropdown Filters ==="

# Base URL
BASE_URL="http://localhost:3001/api/leads"

# Test 1: Sort by newest first (default)
echo -e "\n1. Testing newest first (desc):"
curl -s "${BASE_URL}?sortDirection=desc&limit=3" | jq '.leads[].createdAt' 2>/dev/null || echo "Failed"

# Test 2: Sort by oldest first 
echo -e "\n2. Testing oldest first (asc):"
curl -s "${BASE_URL}?sortDirection=asc&limit=3" | jq '.leads[].createdAt' 2>/dev/null || echo "Failed"

# Test 3: Filter by NextGen pipeline
echo -e "\n3. Testing NextGen filter:"
curl -s "${BASE_URL}?pipelineSource=nextgen" | jq '.total, .leads[0].source' 2>/dev/null || echo "Failed"

# Test 4: Filter by Marketplace pipeline
echo -e "\n4. Testing Marketplace filter:"
curl -s "${BASE_URL}?pipelineSource=marketplace" | jq '.total, .leads[0].source' 2>/dev/null || echo "Failed"

# Test 5: Combined - NextGen + Oldest First
echo -e "\n5. Testing NextGen + Oldest First:"
curl -s "${BASE_URL}?pipelineSource=nextgen&sortDirection=asc&limit=3" | jq '.total, .leads[].source' 2>/dev/null || echo "Failed"

# Test 6: Check total counts
echo -e "\n6. Checking total counts:"
echo -n "All leads: "
curl -s "${BASE_URL}?limit=1" | jq '.total' 2>/dev/null || echo "Failed"
echo -n "NextGen leads: "
curl -s "${BASE_URL}?pipelineSource=nextgen&limit=1" | jq '.total' 2>/dev/null || echo "Failed"
echo -n "Marketplace leads: "
curl -s "${BASE_URL}?pipelineSource=marketplace&limit=1" | jq '.total' 2>/dev/null || echo "Failed"

echo -e "\n=== Test Complete ===\n" 