const mongoose = require("mongoose");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function checkLeadSources() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // Define the Lead schema
    const Lead = mongoose.model(
      "Lead",
      new mongoose.Schema({
        name: String,
        firstName: String,
        lastName: String,
        phone: { type: String, required: true },
        email: String,
        status: { type: String, default: "New" },
        source: { type: String, default: "CSV Import" },
        notes: String,
        createdAt: { type: Date, default: Date.now },
        order: Number,
        leadSource: String,
        originalStatus: String,
        importedAt: Date,
        address: String,
        city: String,
        state: String,
        zipcode: String,
        dateOfBirth: String,
      }),
    );

    // Get total count
    const totalLeads = await Lead.countDocuments();
    console.log(`Total leads in database: ${totalLeads}`);

    // Count by leadSource
    console.log("\nLeads by leadSource field:");
    const leadSourceCounts = await Lead.aggregate([
      {
        $group: {
          _id: "$leadSource",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    leadSourceCounts.forEach((item) => {
      console.log(`- ${item._id || "No leadSource"}: ${item.count} leads`);
    });

    // Count by source field
    console.log("\nLeads by source field:");
    const sourceCounts = await Lead.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    sourceCounts.forEach((item) => {
      console.log(`- ${item._id || "No source"}: ${item.count} leads`);
    });

    // Check for leads that might be NextGen but not properly tagged
    console.log("\nChecking for potential NextGen leads...");

    // Look for leads with NextGen in notes
    const nextgenInNotes = await Lead.countDocuments({
      notes: { $regex: /nextgen/i },
    });
    console.log(`Leads with "NextGen" in notes: ${nextgenInNotes}`);

    // Look for leads with specific NextGen patterns
    const potentialNextGen = await Lead.find({
      $or: [
        { leadSource: { $regex: /nextgen/i } },
        { notes: { $regex: /nextgen/i } },
        { source: { $regex: /nextgen/i } },
      ],
    }).limit(5);

    console.log("\nSample of potential NextGen leads:");
    potentialNextGen.forEach((lead) => {
      console.log(
        `- ${lead.name}: leadSource="${lead.leadSource}", source="${lead.source}"`,
      );
    });

    // Check exact leadSource values
    console.log("\nUnique leadSource values:");
    const uniqueLeadSources = await Lead.distinct("leadSource");
    uniqueLeadSources.forEach((ls) => {
      console.log(`- "${ls}"`);
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkLeadSources();
