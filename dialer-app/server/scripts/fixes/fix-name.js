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

async function fixName() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the lead with email spoolebusiness@outlook.com
    const lead = await Lead.findOne({
      email: "spoolebusiness@outlook.com",
    });

    if (!lead) {
      console.error(
        "Could not find lead with email spoolebusiness@outlook.com",
      );
      process.exit(1);
    }

    console.log("Found lead:", {
      id: lead._id,
      currentName: lead.name,
      email: lead.email,
    });

    // Update the name to Sarah Poole
    lead.name = "Sarah Poole";
    lead.firstName = "Sarah";
    lead.lastName = "Poole";

    await lead.save();
    console.log("Updated lead name:", {
      name: lead.name,
      firstName: lead.firstName,
      lastName: lead.lastName,
    });

    console.log("\nFinished updating lead");
    process.exit(0);
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
}

fixName();
