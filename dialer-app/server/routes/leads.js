/**
 * Leads Routes
 * Handles lead data management, queries, and updates
 */

import express from "express";
// Uncomment when implementing with actual database
// import Lead from '../models/lead.js';

const router = express.Router();

// Get all leads with filtering
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortDirection,
      state,
      disposition,
      search,
      pipelineSource,
    } = req.query;
    console.log("Get leads query:", req.query);

    // Here you would query the database with filters
    // const query = {};
    // if (state) query.state = state;
    // if (disposition) query.disposition = disposition;
    // if (pipelineSource && pipelineSource !== 'All') query.source = pipelineSource;
    // if (search) query.$text = { $search: search };

    // For now, return a properly structured response with mock data
    const mockLeads = [
      {
        id: "1",
        name: "John Doe",
        phone: "(555) 123-4567",
        email: "john@example.com",
        state: "CA",
        disposition: "New Lead",
        source: "Website",
      },
      {
        id: "2",
        name: "Jane Smith",
        phone: "(555) 987-6543",
        email: "jane@example.com",
        state: "NY",
        disposition: "Contacted",
        source: "Referral",
      },
    ];

    // Return proper structure with total field
    res.json({
      success: true,
      leads: mockLeads,
      total: mockLeads.length,
      page: parseInt(page),
      totalPages: 1,
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get call counts
router.get("/call-counts", async (req, res) => {
  try {
    // This would calculate actual call metrics from the database
    res.json({
      success: true,
      todayCalls: 10,
      totalLeads: 150,
      uniqueLeadsCalled: 75,
    });
  } catch (error) {
    console.error("Error fetching call counts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Handle Ringy webhooks
router.post("/ringy-webhook", async (req, res) => {
  try {
    console.log("Received webhook:", req.body);
    // Process webhook data here
    res.json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
