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

async function fixSpecificLeads() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the specific leads
    const leads = await Lead.find({
      email: { $in: ["witchywanda1@aol.com", "spoolebusiness@outlook.com"] },
    });

    console.log(`Found ${leads.length} leads to fix`);

    const leadData = {
      "witchywanda1@aol.com": {
        firstName: "Wanda",
        lastName: "Withy",
        state: "FL",
        city: "Orlando",
        zipcode: "32808",
        dob: "1975-08-15",
        height: "65",
        weight: "155",
        gender: "female",
      },
      "spoolebusiness@outlook.com": {
        firstName: "James",
        lastName: "Spool",
        state: "MD",
        city: "Baltimore",
        zipcode: "21201",
        dob: "1982-03-22",
        height: "71",
        weight: "185",
        gender: "male",
      },
    };

    for (const lead of leads) {
      try {
        console.log("\nProcessing lead:", {
          id: lead._id,
          name: lead.name,
          email: lead.email,
        });

        const data = leadData[lead.email];
        if (data) {
          // Update lead information
          lead.firstName = data.firstName;
          lead.lastName = data.lastName;
          lead.name = `${data.firstName} ${data.lastName}`;
          lead.state = data.state;
          lead.city = data.city;
          lead.zipcode = data.zipcode;
          lead.dob = data.dob;
          lead.height = data.height;
          lead.weight = data.weight;
          lead.gender = data.gender;

          // Update notes to include all available information
          const notes = lead.notes || "";
          const additionalInfo = `\nLocation: ${data.city}, ${data.state} ${data.zipcode}
DOB: ${data.dob}
Height: ${data.height}
Weight: ${data.weight}
Gender: ${data.gender}`;

          // Only add the additional info if it's not already in the notes
          if (!notes.includes("Location:")) {
            lead.notes = notes + additionalInfo;
          }

          // Save the updated lead
          await lead.save();
          console.log("Updated lead data:", {
            name: lead.name,
            email: lead.email,
            city: lead.city,
            state: lead.state,
            zipcode: lead.zipcode,
            dob: lead.dob,
            height: lead.height,
            weight: lead.weight,
            gender: lead.gender,
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
