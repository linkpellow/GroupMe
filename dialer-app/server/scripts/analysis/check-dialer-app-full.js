const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function checkDialerAppDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas - dialer_app database\n");

    const db = mongoose.connection.db;

    // Check the leads collection specifically
    const leadsCount = await db.collection("leads").countDocuments();
    console.log(`📊 LEADS COLLECTION: ${leadsCount} total leads\n`);

    // Get more details about the leads
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

    // Check if there are more leads with different filters
    const activeLeads = await db
      .collection("leads")
      .countDocuments({ status: { $ne: "archived" } });
    const archivedLeads = await db
      .collection("leads")
      .countDocuments({ status: "archived" });

    console.log(`\n📈 Lead breakdown:`);
    console.log(`  - Active/Non-archived: ${activeLeads}`);
    console.log(`  - Archived: ${archivedLeads}`);

    // Check for leads with assignedTo field
    const assignedLeads = await db
      .collection("leads")
      .countDocuments({ assignedTo: { $exists: true } });
    const unassignedLeads = await db
      .collection("leads")
      .countDocuments({ assignedTo: { $exists: false } });

    console.log(`\n👥 Assignment status:`);
    console.log(`  - Assigned: ${assignedLeads}`);
    console.log(`  - Unassigned: ${unassignedLeads}`);

    // Sample some leads to see the data
    console.log("\n📋 Sample leads:");
    const sampleLeads = await db
      .collection("leads")
      .find({})
      .limit(5)
      .toArray();
    sampleLeads.forEach((lead, i) => {
      console.log(
        `\n${i + 1}. ${lead.name || lead.firstName + " " + lead.lastName}`,
      );
      console.log(`   Phone: ${lead.phone || lead.phoneNumber}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Created: ${lead.createdAt}`);
    });

    // Check other collections
    console.log("\n📁 Other collections in dialer_app:");
    const collections = await db.listCollections().toArray();
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`  - ${coll.name}: ${count} documents`);
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkDialerAppDatabase();
