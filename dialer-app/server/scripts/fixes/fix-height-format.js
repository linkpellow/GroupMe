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

async function fixHeightFormat() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the specific leads
    const leads = await Lead.find({
      name: {
        $in: ["Sarah Poole", "Walter Currence"],
      },
    });

    console.log(`Found ${leads.length} leads to fix`);

    for (const lead of leads) {
      try {
        console.log("\nProcessing lead:", {
          id: lead._id,
          name: lead.name,
          currentHeight: lead.height,
        });

        // Remove the extra quotation mark if present
        if (lead.height && lead.height.endsWith('"')) {
          lead.height = lead.height.slice(0, -1);
          await lead.save();
          console.log("Updated height format:", {
            name: lead.name,
            newHeight: lead.height,
          });
        } else {
          console.log("Height format already correct:", {
            name: lead.name,
            height: lead.height,
          });
        }
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

fixHeightFormat();
