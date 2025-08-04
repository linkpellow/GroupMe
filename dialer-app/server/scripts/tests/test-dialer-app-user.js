const mongoose = require("mongoose");

// Using the credentials from the current .env file
const MONGODB_URI =
  "mongodb+srv://dialer_app:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function testDialerAppConnection() {
  try {
    console.log("Testing connection with dialer_app user...");
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
    } else {
      console.log(
        `⚠️  Only ${totalLeads} leads found. Your 2K leads might be:`,
      );
      console.log("   1. In a different database");
      console.log("   2. Under a different user account");
      console.log("   3. Deleted or moved");
    }

    // Check collections
    const collections = await db.listCollections().toArray();
    console.log("\nCollections in database:");
    collections.forEach((col) => {
      console.log(`  - ${col.name}`);
    });

    // Check users
    const users = await db.collection("users").find({}).toArray();
    console.log(`\nUsers in database: ${users.length}`);
    users.forEach((user) => {
      console.log(`  - ${user.email} (${user.name}) - ID: ${user._id}`);
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);

    // Check if it's the database name issue
    if (error.message.includes("Authentication failed")) {
      console.log("\n⚠️  The dialer_app user cannot authenticate.");
      console.log("This could mean:");
      console.log("1. Wrong password");
      console.log("2. User does not exist");
      console.log("3. User exists but has no access to this database");
    }
  }
}

testDialerAppConnection();
