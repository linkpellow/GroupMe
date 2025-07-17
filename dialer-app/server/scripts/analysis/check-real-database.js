const mongoose = require("mongoose");

// Using the CORRECT credentials found in import-leads.ts
// Password needs to be URL encoded: 9526Toast$ -> 9526Toast%24
const MONGODB_URI =
  "mongodb+srv://linkpellowinsurance:9526Toast%24@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function checkRealDatabase() {
  try {
    console.log("Connecting with linkpellowinsurance user...");
    await mongoose.connect(MONGODB_URI);
    console.log(
      "✅ Connected to MongoDB Atlas with linkpellowinsurance user\n",
    );

    const db = mongoose.connection.db;

    // Get total count of ALL leads
    const totalLeads = await db.collection("leads").countDocuments({});
    console.log(`🎯 TOTAL LEADS IN DATABASE: ${totalLeads}\n`);

    if (totalLeads > 1000) {
      console.log(`✅ FOUND YOUR ~2K LEADS!`);
    }

    // Get more details
    const leadsByStatus = await db
      .collection("leads")
      .aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    console.log("Leads by status:");
    leadsByStatus.forEach((status) => {
      console.log(`  - ${status._id || "No status"}: ${status.count} leads`);
    });

    // Check sources
    const leadsBySource = await db
      .collection("leads")
      .aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    console.log("\nLeads by source:");
    leadsBySource.forEach((source) => {
      console.log(`  - ${source._id || "No source"}: ${source.count} leads`);
    });

    // Check users
    const users = await db.collection("users").find({}).toArray();
    console.log(`\nUsers in database: ${users.length}`);
    users.forEach((user) => {
      console.log(`  - ${user.email} (${user.name})`);
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkRealDatabase();
