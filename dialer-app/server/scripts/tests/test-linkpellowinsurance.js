const mongoose = require("mongoose");

// Using the EXACT connection string from import-leads.ts (no URL encoding)
const MONGODB_URI =
  "mongodb+srv://linkpellowinsurance:9526Toast$@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function testConnection() {
  try {
    console.log("Testing connection with linkpellowinsurance user...");
    console.log(
      "Connection string:",
      MONGODB_URI.replace(/:[^:@]+@/, ":****@"),
    ); // Hide password

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected successfully!\n");

    const db = mongoose.connection.db;

    // Get total count of ALL leads
    const totalLeads = await db.collection("leads").countDocuments({});
    console.log(`🎯 TOTAL LEADS IN DATABASE: ${totalLeads}\n`);

    if (totalLeads > 1500) {
      console.log(`✅ FOUND YOUR ~2K LEADS! (${totalLeads} total)`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Connection failed:", error.message);

    // Try with URL encoded password
    console.log("\nTrying with URL-encoded password...");
    const encodedUri = MONGODB_URI.replace("9526Toast$", "9526Toast%24");

    try {
      await mongoose.connect(encodedUri);
      console.log("✅ Connected with URL-encoded password!\n");

      const db = mongoose.connection.db;
      const totalLeads = await db.collection("leads").countDocuments({});
      console.log(`🎯 TOTAL LEADS IN DATABASE: ${totalLeads}\n`);

      if (totalLeads > 1500) {
        console.log(`✅ FOUND YOUR ~2K LEADS! (${totalLeads} total)`);
      }

      await mongoose.disconnect();
    } catch (error2) {
      console.error("❌ Both connection attempts failed");
      console.error("Error:", error2.message);
    }
  }
}

testConnection();
