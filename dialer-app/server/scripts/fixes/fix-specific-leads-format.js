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

// Function to convert height to proper format (e.g., "71" to "7'1")
function formatHeight(height) {
  if (!height) return "";
  // Remove any non-digit characters
  const inches = parseInt(height.replace(/\D/g, ""));
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}`;
}

async function fixSpecificLeads() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the specific leads
    const leads = await Lead.find({
      name: {
        $in: [
          "Cornelius Stewart",
          "Marissa Schultz",
          "Willie Purvis",
          "Douglas Meadows",
          "Vincent George",
        ],
      },
    });

    console.log(`Found ${leads.length} leads to fix`);

    const leadData = {
      "Cornelius Stewart": {
        height: "71",
        weight: "180",
      },
      "Marissa Schultz": {
        height: "65",
        weight: "145",
      },
      "Willie Purvis": {
        height: "70",
        weight: "175",
      },
      "Douglas Meadows": {
        height: "71",
        weight: "190",
      },
      "Vincent George": {
        height: "70",
        weight: "189",
      },
    };

    for (const lead of leads) {
      try {
        console.log("\nProcessing lead:", {
          id: lead._id,
          name: lead.name,
          currentHeight: lead.height,
          currentWeight: lead.weight,
        });

        const data = leadData[lead.name];
        if (data) {
          // Format height properly
          lead.height = formatHeight(data.height);

          // Set weight if missing
          if (!lead.weight) {
            lead.weight = data.weight;
          }

          // Update notes to include all available information
          const notes = lead.notes || "";
          const additionalInfo = `\nHeight: ${lead.height}
Weight: ${lead.weight}`;

          // Only add the additional info if it's not already in the notes
          if (!notes.includes("Height:")) {
            lead.notes = notes + additionalInfo;
          }

          // Save the updated lead
          await lead.save();
          console.log("Updated lead data:", {
            name: lead.name,
            height: lead.height,
            weight: lead.weight,
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

fixSpecificLeads();
