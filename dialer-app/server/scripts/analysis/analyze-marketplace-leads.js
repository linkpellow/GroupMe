const mongoose = require("mongoose");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function analyzeMarketplaceLeads() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Get a sample of marketplace leads
    const marketplaceLeads = await db
      .collection("leads")
      .find({
        source: { $in: ["Marketplace", "marketplace"] },
      })
      .limit(10)
      .toArray();

    console.log(
      `Analyzing ${marketplaceLeads.length} sample marketplace leads...\n`,
    );

    // Analyze what fields have data
    const fieldStats = {};

    marketplaceLeads.forEach((lead, index) => {
      console.log(`\n--- Lead ${index + 1} ---`);
      console.log(`Name: ${lead.name || "EMPTY"}`);
      console.log(`Email: ${lead.email || "EMPTY"}`);
      console.log(`Phone: ${lead.phone || "EMPTY"}`);

      // Check all possible phone fields
      const phoneFields = [
        "phone",
        "Phone",
        "primaryPhone",
        "primaryphone",
        "mobile",
        "cell",
      ];
      phoneFields.forEach((field) => {
        if (lead[field]) {
          console.log(`${field}: ${lead[field]}`);
        }
      });

      // Count which fields have data
      Object.keys(lead).forEach((key) => {
        if (lead[key] && lead[key] !== "" && key !== "_id") {
          if (!fieldStats[key]) fieldStats[key] = 0;
          fieldStats[key]++;
        }
      });
    });

    console.log("\n\n=== FIELD STATISTICS ===");
    console.log("Fields with data across marketplace leads:");
    Object.entries(fieldStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([field, count]) => {
        console.log(`${field}: ${count}/${marketplaceLeads.length} leads`);
      });

    // Check if there's raw data that wasn't mapped
    console.log("\n\n=== CHECKING FOR UNMAPPED DATA ===");
    const leadsWithRawData = await db
      .collection("leads")
      .find({
        source: { $in: ["Marketplace", "marketplace"] },
        $or: [
          { leadID: { $exists: true } },
          { created: { $exists: true } },
          { primaryPhone: { $exists: true } },
        ],
      })
      .limit(5)
      .toArray();

    console.log(
      `Found ${leadsWithRawData.length} leads with potential unmapped data`,
    );
    leadsWithRawData.forEach((lead, index) => {
      console.log(`\n--- Lead with raw data ${index + 1} ---`);
      if (lead.leadID) console.log(`leadID: ${lead.leadID}`);
      if (lead.created) console.log(`created: ${lead.created}`);
      if (lead.primaryPhone) console.log(`primaryPhone: ${lead.primaryPhone}`);
      if (lead.phone) console.log(`phone: ${lead.phone}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n\nDisconnected from MongoDB");
  }
}

analyzeMarketplaceLeads();
