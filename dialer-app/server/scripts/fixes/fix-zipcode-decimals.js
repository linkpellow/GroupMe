const mongoose = require("mongoose");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function fixZipcodes() {
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

    // Find all leads with zipcodes ending in .0
    const leadsWithDecimalZip = await Lead.find({
      zipcode: { $regex: /\.0$/ },
    });

    console.log(`Found ${leadsWithDecimalZip.length} leads with .0 in zipcode`);

    let fixed = 0;
    for (const lead of leadsWithDecimalZip) {
      const oldZip = lead.zipcode;
      const newZip = oldZip.replace(/\.0$/, "");

      lead.zipcode = newZip;
      await lead.save();

      fixed++;
      console.log(`Fixed: ${lead.name} - Zipcode: ${oldZip} → ${newZip}`);
    }

    console.log(`\n✅ Fixed ${fixed} zipcodes`);

    // Show some examples of the fixed data
    const exampleLeads = await Lead.find({
      zipcode: { $exists: true, $ne: "" },
    }).limit(5);
    console.log("\nExample leads with zipcodes:");
    exampleLeads.forEach((lead) => {
      console.log(
        `- ${lead.name}: ${lead.city}, ${lead.state} ${lead.zipcode}`,
      );
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixZipcodes();
