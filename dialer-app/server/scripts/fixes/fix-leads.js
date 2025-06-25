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

async function fixLeads() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find leads with missing information
    const leads = await Lead.find({
      $or: [
        { state: { $in: ["", null, undefined] } },
        { city: { $in: ["", null, undefined] } },
        { zipcode: { $in: ["", null, undefined] } },
        { dob: { $in: ["", null, undefined] } },
        { height: { $in: ["", null, undefined] } },
        { weight: { $in: ["", null, undefined] } },
        { gender: { $in: ["", null, undefined] } },
      ],
    });

    console.log(`Found ${leads.length} leads with missing information`);

    for (const lead of leads) {
      try {
        console.log("\nProcessing lead:", {
          id: lead._id,
          name: lead.name,
          email: lead.email,
        });

        // Extract location information from notes
        if (lead.notes && lead.notes.includes("Location:")) {
          const locationMatch = lead.notes.match(
            /Location: ([^,]+), ([A-Z]{2}) (\d{5})/,
          );
          if (locationMatch) {
            lead.city = locationMatch[1].trim();
            lead.state = locationMatch[2].trim();
            lead.zipcode = locationMatch[3].trim();
            console.log("Extracted location:", {
              city: lead.city,
              state: lead.state,
              zipcode: lead.zipcode,
            });
          }
        }

        // Try to extract other information from notes
        if (lead.notes) {
          // Extract DOB
          const dobMatch = lead.notes.match(/DOB: ([^\n]+)/);
          if (dobMatch && dobMatch[1].trim() !== "") {
            lead.dob = dobMatch[1].trim();
          }

          // Extract Height
          const heightMatch = lead.notes.match(/Height: ([^\n]+)/);
          if (heightMatch && heightMatch[1].trim() !== "") {
            lead.height = heightMatch[1].trim();
          }

          // Extract Weight
          const weightMatch = lead.notes.match(/Weight: ([^\n]+)/);
          if (weightMatch && weightMatch[1].trim() !== "") {
            lead.weight = weightMatch[1].trim();
          }

          // Extract Gender
          const genderMatch = lead.notes.match(/Gender: ([^\n]+)/);
          if (genderMatch && genderMatch[1].trim() !== "") {
            lead.gender = genderMatch[1].trim();
          }
        }

        // If still missing information, try to extract from JSON in notes
        if (lead.notes && lead.notes.includes("{")) {
          try {
            const jsonMatch = lead.notes.match(/\{[^}]+\}/);
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[0]);

              // Extract missing fields from JSON
              if (!lead.city && jsonData.city) lead.city = jsonData.city;
              if (!lead.state && jsonData.state) lead.state = jsonData.state;
              if (!lead.zipcode && jsonData.zip_code)
                lead.zipcode = jsonData.zip_code;
              if (!lead.dob && jsonData.birthday) lead.dob = jsonData.birthday;
              if (!lead.height && jsonData.height)
                lead.height = jsonData.height;
              if (!lead.weight && jsonData.weight)
                lead.weight = jsonData.weight;
              if (!lead.gender && jsonData.gender)
                lead.gender = jsonData.gender;
            }
          } catch (e) {
            console.log("Could not parse JSON from notes");
          }
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

fixLeads();
