const mongoose = require("mongoose");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function deletePhonelessLeads() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Count marketplace leads without phone numbers
    const phonelessCount = await db.collection("leads").countDocuments({
      source: { $in: ["Marketplace", "marketplace"] },
      $or: [{ phone: "" }, { phone: null }, { phone: { $exists: false } }],
    });

    console.log(
      `Found ${phonelessCount} marketplace leads without phone numbers`,
    );

    if (phonelessCount > 0) {
      console.log("\nThese leads are useless without phone numbers.");
      console.log(
        "Do you want to delete them? (They can be re-imported properly later)",
      );
      console.log("\nDeleting phoneless marketplace leads...");

      // Delete all marketplace leads without phone numbers
      const result = await db.collection("leads").deleteMany({
        source: { $in: ["Marketplace", "marketplace"] },
        $or: [{ phone: "" }, { phone: null }, { phone: { $exists: false } }],
      });

      console.log(
        `\n✅ Deleted ${result.deletedCount} phoneless marketplace leads`,
      );

      // Check remaining leads
      const remainingTotal = await db.collection("leads").countDocuments({});
      const remainingMarketplace = await db.collection("leads").countDocuments({
        source: { $in: ["Marketplace", "marketplace"] },
      });

      console.log(`\n📊 Database Status:`);
      console.log(`Total leads remaining: ${remainingTotal}`);
      console.log(`Marketplace leads remaining: ${remainingMarketplace}`);
    } else {
      console.log("\nNo phoneless marketplace leads found.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Add confirmation
console.log(
  "⚠️  WARNING: This will delete all marketplace leads without phone numbers!",
);
console.log("These leads cannot be called without phone numbers anyway.");
console.log("\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n");

setTimeout(() => {
  deletePhonelessLeads();
}, 5000);
