const axios = require('axios');

// Test script to get actual API response structures
async function testApiResponses() {
  const baseURL = 'https://crokodial.com/api';
  
  console.log('🔍 Testing API Response Structures...\n');

  try {
    // You'll need to replace this with a real JWT token
    const token = 'YOUR_JWT_TOKEN_HERE';
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('📊 Testing /leads/stats endpoint...');
    try {
      const statsResponse = await axios.get(`${baseURL}/leads/stats`, { headers });
      console.log('✅ /leads/stats Response Structure:');
      console.log(JSON.stringify(statsResponse.data, null, 2));
      console.log('\n' + '='.repeat(80) + '\n');
    } catch (error) {
      console.log('❌ /leads/stats Error:', error.response?.data || error.message);
    }

    console.log('📈 Testing /analytics/sold/lead-details endpoint...');
    try {
      const leadDetailsResponse = await axios.get(`${baseURL}/analytics/sold/lead-details`, { 
        headers,
        params: { timePeriod: 'monthly' }
      });
      console.log('✅ /analytics/sold/lead-details Response Structure:');
      console.log(JSON.stringify(leadDetailsResponse.data, null, 2));
      console.log('\n' + '='.repeat(80) + '\n');
    } catch (error) {
      console.log('❌ /analytics/sold/lead-details Error:', error.response?.data || error.message);
    }

    console.log('📊 Testing /analytics/sold/cpa endpoint...');
    try {
      const cpaResponse = await axios.get(`${baseURL}/analytics/sold/cpa`, { 
        headers,
        params: { timePeriod: 'monthly' }
      });
      console.log('✅ /analytics/sold/cpa Response Structure:');
      console.log(JSON.stringify(cpaResponse.data, null, 2));
      console.log('\n' + '='.repeat(80) + '\n');
    } catch (error) {
      console.log('❌ /analytics/sold/cpa Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Also show what the frontend expects based on the interface
function showExpectedStructure() {
  console.log('📋 Frontend Expected Structure (from AnalyticsData interface):\n');
  
  const expectedStructure = {
    analyticsData: {
      sourceCodes: [
        {
          code: "string",
          totalLeads: "number",
          soldLeads: "number", 
          conversionRate: "number",
          revenue: "number",
          avgCost: "number"
        }
      ],
      campaigns: [
        {
          name: "string",
          leads: "number",
          sold: "number",
          cost: "number",
          revenue: "number",
          roi: "number"
        }
      ],
      demographics: [
        {
          state: "string",
          count: "number",
          revenue: "number",
          avgAge: "number"
        }
      ],
      timeline: [
        {
          date: "string (YYYY-MM-DD)",
          leads: "number",
          sold: "number", 
          revenue: "number"
        }
      ],
      cpa: {
        totalCost: "number",
        totalSales: "number",
        costPerAcquisition: "number"
      },
      totalLeads: "number",
      totalRevenue: "number"
    },
    statsData: {
      totalLeads: "number",
      filterOptions: {
        states: ["array of strings"],
        dispositions: ["array of strings"],
        sources: ["array of strings"]
      },
      breakdowns: {
        prices: ["array of numbers"],
        sourceHashes: ["array of strings"],
        campaigns: ["array of strings"],
        sourceCodes: ["array of strings"],
        cities: ["array of strings"]
      },
      counts: {
        uniqueStates: "number",
        uniqueDispositions: "number", 
        uniqueSources: "number",
        uniquePrices: "number",
        uniqueCampaigns: "number",
        uniqueSourceCodes: "number",
        uniqueCities: "number"
      }
    }
  };

  console.log(JSON.stringify(expectedStructure, null, 2));
}

console.log('🎯 API Response Structure Testing\n');
showExpectedStructure();
console.log('\n' + '='.repeat(80) + '\n');

// Uncomment and add your JWT token to test actual responses:
// testApiResponses(); 