const mongoose = require("mongoose");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function deleteAllPhonelessLeads() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Count ALL leads without phone numbers
    const phonelessCount = await db.collection("leads").countDocuments({
      $or: [{ phone: "" }, { phone: null }, { phone: { $exists: false } }],
    });

    console.log(
      `Found ${phonelessCount} leads without phone numbers (from all sources)`,
    );

    if (phonelessCount > 0) {
      console.log("\nThese leads are useless without phone numbers.");
      console.log("Deleting ALL phoneless leads...");

      // Delete ALL leads without phone numbers
      const result = await db.collection("leads").deleteMany({
        $or: [{ phone: "" }, { phone: null }, { phone: { $exists: false } }],
      });

      console.log(`\n✅ Deleted ${result.deletedCount} phoneless leads`);

      // Check remaining leads
      const remainingTotal = await db.collection("leads").countDocuments({});
      const remainingBySource = await db
        .collection("leads")
        .aggregate([
          { $group: { _id: "$source", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      console.log(`\n📊 Database Status:`);
      console.log(`Total leads remaining: ${remainingTotal}`);
      console.log(`\nBreakdown by source:`);
      remainingBySource.forEach((source) => {
        console.log(`  ${source._id || "Unknown"}: ${source.count} leads`);
      });
    } else {
      console.log("\nNo phoneless leads found. All leads have phone numbers!");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run immediately
console.log("🗑️  Deleting ALL leads without phone numbers...\n");
deleteAllPhonelessLeads();
