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

async function updateTodaysLeads() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find Link Pellow's lead
    const linkPellowLead = await Lead.findOne({ name: "Link Pellow" });

    if (!linkPellowLead) {
      console.error("Could not find Link Pellow's lead");
      process.exit(1);
    }

    console.log(
      "Found Link Pellow's lead created at:",
      linkPellowLead.createdAt,
    );

    // Find all leads created after Link Pellow's lead
    const leads = await Lead.find({
      createdAt: { $gt: linkPellowLead.createdAt },
    });

    console.log(`Found ${leads.length} leads to update`);

    for (const lead of leads) {
      try {
        console.log("\nProcessing lead:", {
          id: lead._id,
          name: lead.name,
          createdAt: lead.createdAt,
          currentDisposition: lead.disposition,
        });

        // Update disposition to "New Lead"
        lead.disposition = "New Lead";

        // Add gold badge to notes if not already present
        const notes = lead.notes || "";
        if (!notes.includes("🏆 GOLD BADGE")) {
          lead.notes = `🏆 GOLD BADGE - New Lead Today\n${notes}`;
        }

        await lead.save();
        console.log("Updated lead:", {
          name: lead.name,
          newDisposition: lead.disposition,
        });
      } catch (error) {
        console.error(`Error updating lead ${lead._id}:`, error);
      }
    }

    console.log("\nFinished updating leads");
    process.exit(0);
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
}

updateTodaysLeads();
