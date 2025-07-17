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

async function fixWalter() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the lead with email witchywanda1@aol.com
    const lead = await Lead.findOne({
      email: "witchywanda1@aol.com",
    });

    if (!lead) {
      console.error("Could not find lead with email witchywanda1@aol.com");
      process.exit(1);
    }

    console.log("Found lead:", {
      id: lead._id,
      currentName: lead.name,
      email: lead.email,
    });

    // Update to Walter Currence's information
    lead.name = "Walter Currence";
    lead.firstName = "Walter";
    lead.lastName = "Currence";
    lead.email = "witchywanda1@aol.com";
    lead.disposition = "New Lead";

    // Add golden badge to notes if not already present
    if (!lead.notes || !lead.notes.includes("🌟 New Lead")) {
      lead.notes = lead.notes ? `${lead.notes}\n\n🌟 New Lead` : "🌟 New Lead";
    }

    await lead.save();
    console.log("Updated lead:", {
      name: lead.name,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      disposition: lead.disposition,
    });

    console.log("\nFinished updating Walter Currence lead");
    process.exit(0);
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
}

fixWalter();
