const mongoose = require("mongoose");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function deepAnalyzeMarketplace() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Get ALL marketplace leads
    const marketplaceLeads = await db
      .collection("leads")
      .find({
        source: { $in: ["Marketplace", "marketplace"] },
      })
      .toArray();

    console.log(`Found ${marketplaceLeads.length} marketplace leads\n`);

    // Check for any field that might contain phone data
    const phonePatterns = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\d{10}\b/;
    let leadsWithHiddenPhones = 0;

    marketplaceLeads.forEach((lead) => {
      let foundPhone = false;

      // Check every field for phone patterns
      Object.entries(lead).forEach(([key, value]) => {
        if (
          typeof value === "string" &&
          phonePatterns.test(value) &&
          key !== "phone"
        ) {
          console.log(`Found phone in ${key} field for ${lead.name}: ${value}`);
          foundPhone = true;
        }
      });

      if (foundPhone) leadsWithHiddenPhones++;
    });

    console.log(
      `\nFound ${leadsWithHiddenPhones} leads with phone numbers in other fields`,
    );

    // Check if these leads were imported without proper phone mapping
    console.log("\n=== CHECKING RAW IMPORT DATA ===");
    const sampleLeads = marketplaceLeads.slice(0, 5);

    sampleLeads.forEach((lead, index) => {
      console.log(`\nLead ${index + 1}: ${lead.name}`);
      console.log("All fields:");
      Object.entries(lead).forEach(([key, value]) => {
        if (
          value &&
          value !== "" &&
          !["_id", "createdAt", "updatedAt", "__v"].includes(key)
        ) {
          console.log(
            `  ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`,
          );
        }
      });
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n\nDisconnected from MongoDB");
  }
}

deepAnalyzeMarketplace();
