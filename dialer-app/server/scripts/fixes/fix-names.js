#!/usr/bin/env node

/**
 * Script to fix name fields in leads where the bid_type ("exclusive")
 * has been incorrectly stored as firstName and names are in wrong fields
 *
 * Usage: node fix-names.js
 */

require("ts-node/register");
require("./src/scripts/fix-name-fields.ts");

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

async function fixNames() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find and fix Walter Currence's lead
    const walterLead = await Lead.findOne({
      $or: [{ name: "Walter Currence" }, { name: "Wanda Withy" }],
    });

    if (walterLead) {
      console.log("Found lead to fix:", {
        id: walterLead._id,
        currentName: walterLead.name,
        email: walterLead.email,
      });

      // Update to correct name
      walterLead.name = "Walter Currence";
      walterLead.firstName = "Walter";
      walterLead.lastName = "Currence";

      await walterLead.save();
      console.log("Updated lead name:", {
        name: walterLead.name,
        firstName: walterLead.firstName,
        lastName: walterLead.lastName,
      });
    }

    // Find duplicate Sarah Poole leads
    const sarahLeads = await Lead.find({
      name: "Sarah Poole",
    });

    if (sarahLeads.length > 1) {
      console.log(`Found ${sarahLeads.length} Sarah Poole leads`);

      // Keep the most recent lead and delete others
      const [mostRecent, ...duplicates] = sarahLeads.sort(
        (a, b) => b.createdAt - a.createdAt,
      );

      for (const duplicate of duplicates) {
        await Lead.deleteOne({ _id: duplicate._id });
        console.log("Deleted duplicate Sarah Poole lead:", duplicate._id);
      }
    }

    console.log("\nFinished fixing names and duplicates");
    process.exit(0);
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  }
}

fixNames();
