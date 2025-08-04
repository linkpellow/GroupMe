const mongoose = require("mongoose");

// Using the credentials from the .env file
const MONGODB_URI =
  "mongodb+srv://dialer_app:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function checkDialerAppUser() {
  try {
    console.log("Connecting with dialer_app user...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas with dialer_app user\n");

    const db = mongoose.connection.db;

    // Get total count of ALL leads
    const totalLeads = await db.collection("leads").countDocuments({});
    console.log(`🎯 TOTAL LEADS IN DATABASE: ${totalLeads}\n`);

    if (totalLeads > 1000) {
      console.log(`✅ FOUND YOUR ~2K LEADS!`);
    }

    // Get sample leads
    const sampleLeads = await db
      .collection("leads")
      .find({})
      .limit(5)
      .toArray();
    console.log("\nSample leads:");
    sampleLeads.forEach((lead) => {
      console.log(`  - ${lead.name} (${lead.phone}) - Status: ${lead.status}`);
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

checkDialerAppUser();
