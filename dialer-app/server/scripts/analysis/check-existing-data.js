const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function checkExistingData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas - dialer_app database\n");

    const db = mongoose.connection.db;

    console.log("=== CURRENT DATABASE CONTENTS ===\n");

    // Check leads with notes
    const leadsWithNotes = await db
      .collection("leads")
      .find({
        notes: { $exists: true, $ne: "" },
      })
      .toArray();

    console.log(`📝 Leads with notes: ${leadsWithNotes.length}`);
    if (leadsWithNotes.length > 0) {
      console.log("Sample notes:");
      leadsWithNotes.slice(0, 3).forEach((lead, i) => {
        console.log(`  ${i + 1}. ${lead.name}:`);
        console.log(`     Notes: ${lead.notes.substring(0, 100)}...`);
      });
    }

    // Check calls
    const callsCount = await db.collection("calls").countDocuments();
    console.log(`\n📞 Total calls recorded: ${callsCount}`);
    if (callsCount > 0) {
      const recentCalls = await db
        .collection("calls")
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      console.log("Recent calls:");
      recentCalls.forEach((call, i) => {
        console.log(
          `  ${i + 1}. Duration: ${call.duration}s, Date: ${call.createdAt}`,
        );
      });
    }

    // Check dispositions
    const dispositionsCount = await db
      .collection("dispositions")
      .countDocuments();
    console.log(`\n🏷️  Custom dispositions: ${dispositionsCount}`);

    // Check messages
    const messagesCount = await db.collection("messages").countDocuments();
    console.log(`\n💬 Messages sent: ${messagesCount}`);

    // Check leads with dispositions
    const leadsWithDispositions = await db
      .collection("leads")
      .find({
        disposition: { $exists: true, $ne: "", $ne: null },
      })
      .toArray();

    console.log(
      `\n📊 Leads with dispositions: ${leadsWithDispositions.length}`,
    );
    if (leadsWithDispositions.length > 0) {
      // Group by disposition
      const dispositionGroups = {};
      leadsWithDispositions.forEach((lead) => {
        const disp = lead.disposition || "Unknown";
        dispositionGroups[disp] = (dispositionGroups[disp] || 0) + 1;
      });

      console.log("Disposition breakdown:");
      Object.entries(dispositionGroups).forEach(([disp, count]) => {
        console.log(`  - ${disp}: ${count} leads`);
      });
    }

    // Check for any custom fields or important data
    const sampleLead = await db.collection("leads").findOne();
    if (sampleLead) {
      console.log("\n🔍 Lead fields in use:");
      console.log(Object.keys(sampleLead).join(", "));
    }

    console.log("\n⚠️  IMPORTANT: If you reload leads:");
    console.log("- Notes will be LOST unless leads have the same _id");
    console.log("- Call history will remain but may not link to new leads");
    console.log("- Dispositions on existing leads will be LOST");
    console.log("- Custom dispositions definitions will remain");

    console.log("\n💡 RECOMMENDATION:");
    console.log("1. Export current leads with notes/dispositions first");
    console.log("2. Or update leads incrementally instead of full reload");

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkExistingData();
