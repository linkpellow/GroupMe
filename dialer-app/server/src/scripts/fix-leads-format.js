"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Lead_1 = __importDefault(require("../models/Lead"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const fixLeadsFormat = async () => {
  try {
    // Connect to MongoDB
    await mongoose_1.default.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");
    // Find leads with unknown names or missing information
    const leads = await Lead_1.default.find({
      $or: [
        { name: "Unknown Name" },
        { name: { $exists: false } },
        { firstName: { $exists: false } },
        { lastName: { $exists: false } },
        { state: { $exists: false } },
        { city: { $exists: false } },
        { zipcode: { $exists: false } },
        { dob: { $exists: false } },
        { height: { $exists: false } },
        { weight: { $exists: false } },
        { gender: { $exists: false } },
        { phone: { $exists: false } },
        { email: { $exists: false } },
      ],
    });
    console.log(`Found ${leads.length} leads to fix`);
    for (const lead of leads) {
      try {
        let jsonData = {};
        // Try to extract JSON data from notes
        if (lead.notes && lead.notes.includes("{")) {
          try {
            const jsonStr = lead.notes.split("\n")[0];
            jsonData = JSON.parse(jsonStr);
          } catch (e) {
            console.log("Could not parse JSON from notes for lead:", lead._id);
          }
        }
        // Extract data from JSON or use existing values
        const firstName =
          jsonData.first_name || jsonData.firstName || lead.firstName || "";
        const lastName =
          jsonData.last_name || jsonData.lastName || lead.lastName || "";
        const phone =
          jsonData.phone_number || jsonData.phoneNumber || lead.phone || "";
        const email = jsonData.email || lead.email || "";
        const state = jsonData.state || lead.state || "";
        const city = jsonData.city || lead.city || "";
        const zipcode =
          jsonData.zip_code || jsonData.zipCode || lead.zipcode || "";
        const dob = jsonData.birthday || jsonData.dateOfBirth || lead.dob || "";
        const height = jsonData.height || lead.height || "";
        const weight = jsonData.weight || lead.weight || "";
        const gender = jsonData.gender || lead.gender || "";
        // Set the name fields
        lead.firstName = firstName || "Unknown";
        lead.lastName = lastName || "Name";
        lead.name = `${lead.firstName} ${lead.lastName}`.trim();
        // Clean up phone number
        lead.phone = phone.replace(/\D/g, "");
        // Ensure email exists
        lead.email = email || `${lead.phone}@noemail.com`;
        // Set other fields
        lead.state = state;
        lead.city = city;
        lead.zipcode = zipcode;
        lead.dob = dob;
        lead.height = height;
        lead.weight = weight;
        lead.gender = gender;
        lead.disposition = lead.disposition || "New Lead";
        // Update notes to include all available information
        const notes = lead.notes || "";
        const additionalInfo = `\nLocation: ${lead.city}, ${lead.state} ${lead.zipcode}
DOB: ${lead.dob}
Height: ${lead.height}
Weight: ${lead.weight}
Gender: ${lead.gender}`;
        // Only add the additional info if it's not already in the notes
        if (!notes.includes("Location:")) {
          lead.notes = notes + additionalInfo;
        }
        // Save the updated lead
        await lead.save();
        console.log(`Updated lead: ${lead.name} (ID: ${lead._id})`);
      } catch (error) {
        console.error(`Error updating lead ${lead._id}:`, error);
      }
    }
    console.log("Finished updating leads");
    process.exit(0);
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
};
fixLeadsFormat();
