const mongoose = require("mongoose");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function fixNextGenSource() {
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

    // Find leads with NextGen in notes but wrong source
    const nextgenLeads = await Lead.find({
      notes: { $regex: /nextgen/i },
      source: { $ne: "NextGen" },
    });

    console.log(
      `Found ${nextgenLeads.length} leads with "NextGen" in notes but wrong source field`,
    );

    let fixed = 0;
    for (const lead of nextgenLeads) {
      const oldSource = lead.source;
      lead.source = "NextGen";
      await lead.save();

      fixed++;
      console.log(`Fixed: ${lead.name} - Source: ${oldSource} → NextGen`);
    }

    console.log(`\n✅ Fixed ${fixed} leads`);

    // Show updated counts
    console.log("\nUpdated source distribution:");
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
      console.log(`- ${item._id}: ${item.count} leads`);
    });

    // Double-check NextGen count
    const nextgenCount = await Lead.countDocuments({ source: "NextGen" });
    console.log(`\nTotal NextGen leads now: ${nextgenCount}`);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixNextGenSource();
