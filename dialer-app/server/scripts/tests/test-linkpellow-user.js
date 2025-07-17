const mongoose = require("mongoose");

// Testing the linkpellow user mentioned in many scripts
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function testLinkpellowConnection() {
  try {
    console.log("Testing connection with linkpellow:admin123...");
    console.log(
      "Connection string:",
      MONGODB_URI.replace(/:[^:@]+@/, ":****@"),
    );

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected successfully to MongoDB Atlas!\n");

    const db = mongoose.connection.db;

    // Get total count of ALL leads
    const totalLeads = await db.collection("leads").countDocuments({});
    console.log(`🎯 TOTAL LEADS IN DATABASE: ${totalLeads}\n`);

    if (totalLeads > 1500) {
      console.log(`✅ FOUND YOUR ~2K LEADS! (${totalLeads} total)`);
      console.log("\n🎉 SUCCESS! This is the correct database and user!");
      console.log("Update your .env file with:");
      console.log("MONGODB_URI=" + MONGODB_URI);
    } else {
      console.log(`⚠️  Only ${totalLeads} leads found in this database.`);
    }

    // Get sample leads to verify
    const sampleLeads = await db
      .collection("leads")
      .find({})
      .limit(5)
      .toArray();
    console.log("\nSample leads:");
    sampleLeads.forEach((lead) => {
      console.log(
        `  - ${lead.name} (${lead.phone}) - Created: ${lead.createdAt}`,
      );
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  }
}

testLinkpellowConnection();
