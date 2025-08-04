const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function checkAllAssignments() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas - dialer_app database\n");

    const db = mongoose.connection.db;

    // Get total count of ALL leads without any filters
    const totalLeads = await db.collection("leads").countDocuments({});
    console.log(`📊 TOTAL LEADS IN DATABASE: ${totalLeads}\n`);

    // Group leads by assignedTo
    const leadsByAssignment = await db
      .collection("leads")
      .aggregate([
        {
          $group: {
            _id: "$assignedTo",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    console.log("📋 Leads by assignment:");
    let totalCounted = 0;

    for (const group of leadsByAssignment) {
      totalCounted += group.count;

      if (group._id === null) {
        console.log(`  - UNASSIGNED: ${group.count} leads`);
      } else {
        // Look up the user
        const user = await db.collection("users").findOne({ _id: group._id });
        const userName = user ? `${user.name} (${user.email})` : "Unknown User";
        console.log(`  - ${userName}: ${group.count} leads`);
      }
    }

    console.log(`\n✅ Total counted: ${totalCounted}`);

    // Check for different sources
    console.log("\n📊 Leads by source:");
    const leadsBySource = await db
      .collection("leads")
      .aggregate([
        {
          $group: {
            _id: "$source",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    leadsBySource.forEach((source) => {
      console.log(`  - ${source._id || "No source"}: ${source.count} leads`);
    });

    // Check for NextGen leads specifically
    const nextgenCount = await db.collection("leads").countDocuments({
      $or: [
        { source: "NextGen" },
        { nextgenId: { $exists: true } },
        { notes: { $regex: /NextGen/i } },
      ],
    });
    console.log(`\n🎯 NextGen leads (by various criteria): ${nextgenCount}`);

    // Sample some unassigned leads
    const unassignedLeads = await db
      .collection("leads")
      .find({ assignedTo: null })
      .limit(5)
      .toArray();
    if (unassignedLeads.length > 0) {
      console.log("\n📋 Sample unassigned leads:");
      unassignedLeads.forEach((lead, i) => {
        console.log(
          `  ${i + 1}. ${lead.name || lead.firstName + " " + lead.lastName}`,
        );
        console.log(`     Phone: ${lead.phone || lead.phoneNumber}`);
        console.log(`     Created: ${lead.createdAt}`);
        console.log(`     Source: ${lead.source || "Unknown"}`);
      });
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkAllAssignments();
