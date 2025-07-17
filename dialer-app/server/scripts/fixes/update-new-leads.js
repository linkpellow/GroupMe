require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define Lead schema
const leadSchema = new Schema({
  name: String,
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  status: String,
  source: String,
  notes: String,
  assignedTo: Schema.Types.ObjectId,
  disposition: String,
  state: String,
  city: String,
  zipcode: String,
  dob: String,
  height: String,
  weight: String,
  gender: String,
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Lead = mongoose.model("Lead", leadSchema);

async function updateNewLeads() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // First find Link Pellow's lead
    const linkPellowLead = await Lead.findOne({ name: "Link Pellow" });

    if (!linkPellowLead) {
      console.error("Could not find Link Pellow lead");
      process.exit(1);
    }

    console.log("Found Link Pellow lead:", {
      id: linkPellowLead._id,
      name: linkPellowLead.name,
      createdAt: linkPellowLead.createdAt,
    });

    // Find all leads created after Link Pellow's lead
    const newLeads = await Lead.find({
      createdAt: { $gt: linkPellowLead.createdAt },
    });

    console.log(`Found ${newLeads.length} leads to update`);

    // Update each lead
    for (const lead of newLeads) {
      console.log("\nProcessing lead:", {
        id: lead._id,
        name: lead.name,
        currentDisposition: lead.disposition,
      });

      // Update disposition to "New Lead"
      lead.disposition = "New Lead";

      // Add golden badge to notes if not already present
      if (!lead.notes || !lead.notes.includes("🌟 New Lead")) {
        lead.notes = lead.notes
          ? `${lead.notes}\n\n🌟 New Lead`
          : "🌟 New Lead";
      }

      await lead.save();
      console.log("Updated lead:", {
        name: lead.name,
        disposition: lead.disposition,
      });
    }

    console.log("\nFinished updating leads");
    process.exit(0);
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
}

updateNewLeads();
