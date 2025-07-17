"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Lead_1 = __importDefault(require("../models/Lead"));
// Load environment variables
dotenv_1.default.config();
async function fixAllNames() {
  try {
    console.log("Starting comprehensive name field correction...");
    // Connect to MongoDB
    await mongoose_1.default.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");
    // Get all leads
    const allLeads = await Lead_1.default.find({});
    console.log(`Found ${allLeads.length} total leads to analyze`);
    let fixedCount = 0;
    let errorCount = 0;
    for (const lead of allLeads) {
      try {
        let needsUpdate = false;
        let fieldChanges = {};
        const originalValues = {
          name: lead.name,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          bidType: lead.bidType,
        };
        // Case 1: "exclusive" in firstName field (bid_type confusion)
        if (lead.firstName?.toLowerCase() === "exclusive") {
          fieldChanges.bidType = "exclusive";
          fieldChanges.firstName = lead.lastName || "";
          fieldChanges.lastName = "";
          // Check if phone field might have the last name
          if (lead.phone && isNaN(Number(lead.phone.replace(/\D/g, "")))) {
            fieldChanges.lastName = lead.phone;
            fieldChanges.phone = "";
            // Try to extract phone from notes
            if (lead.notes) {
              try {
                const notesObj =
                  typeof lead.notes === "string"
                    ? JSON.parse(lead.notes)
                    : lead.notes;
                if (notesObj.phone) {
                  fieldChanges.phone = notesObj.phone;
                }
              } catch (e) {
                // Not valid JSON, continue
              }
            }
          }
          needsUpdate = true;
        }
        // Case 2: Name appears to be flipped (lastName in firstName field)
        else if (
          lead.name &&
          lead.firstName &&
          lead.lastName &&
          !lead.name.includes(lead.firstName) &&
          lead.name.includes(lead.lastName)
        ) {
          fieldChanges.firstName = lead.lastName;
          fieldChanges.lastName = lead.firstName;
          needsUpdate = true;
        }
        // Case 3: Name is empty but firstName and lastName exist
        else if (
          (!lead.name || lead.name === "Unknown") &&
          (lead.firstName || lead.lastName)
        ) {
          needsUpdate = true;
        }
        // Case 4: Check for bid type values in other fields
        const bidTypeValues = ["exclusive", "priority", "standard"];
        for (const value of bidTypeValues) {
          if (
            lead.name?.toLowerCase().includes(value) ||
            lead.lastName?.toLowerCase().includes(value)
          ) {
            if (!lead.bidType) {
              fieldChanges.bidType = value;
              needsUpdate = true;
            }
            // If lastName is just the bid type, clear it
            if (lead.lastName?.toLowerCase() === value) {
              fieldChanges.lastName = "";
              needsUpdate = true;
            }
          }
        }
        // Update the record if needed
        if (needsUpdate) {
          // Apply all changes
          for (const [field, value] of Object.entries(fieldChanges)) {
            lead[field] = value;
          }
          // Reconstruct the full name from firstName and lastName
          const firstName =
            fieldChanges.firstName !== undefined
              ? fieldChanges.firstName
              : lead.firstName || "";
          const lastName =
            fieldChanges.lastName !== undefined
              ? fieldChanges.lastName
              : lead.lastName || "";
          lead.name =
            `${firstName} ${lastName}`.trim() || lead.name || "Unknown";
          await lead.save();
          console.log(`Fixed lead ${lead._id}:`);
          console.log("  Original:", originalValues);
          console.log("  Updated:", {
            name: lead.name,
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
            bidType: lead.bidType,
          });
          fixedCount++;
        }
      } catch (error) {
        console.error(`Error fixing lead ${lead._id}:`, error);
        errorCount++;
      }
    }
    console.log(
      `Finished fixing names. Results: ${fixedCount} fixed, ${errorCount} errors, ${allLeads.length - fixedCount - errorCount} unchanged`,
    );
  } catch (error) {
    console.error("Error in fix-all-names script:", error);
  } finally {
    await mongoose_1.default.connection.close();
    console.log("MongoDB connection closed");
  }
}
// Run the fix
fixAllNames().catch(console.error);
