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
async function deleteExclusiveLeads() {
  try {
    console.log('Starting deletion of leads with "exclusive" in name...');
    // Connect to MongoDB
    await mongoose_1.default.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");
    // Find leads with "exclusive" in the name field OR in bidType field
    const query = {
      $or: [
        { name: { $regex: /exclusive/i } }, // Case-insensitive search for "exclusive" in name
        { bidType: "exclusive" }, // Also check for exclusive in bidType field
      ],
    };
    const exclusiveLeads = await Lead_1.default.find(query);
    console.log(
      `Found ${exclusiveLeads.length} leads with "exclusive" in name or bidType`,
    );
    // Log the leads we're about to delete
    console.log("Leads to be deleted:");
    exclusiveLeads.forEach((lead) => {
      console.log(
        `- ID: ${lead._id}, Name: "${lead.name}", Phone: ${lead.phone}, BidType: ${lead.bidType}`,
      );
    });
    // Delete the leads
    if (exclusiveLeads.length > 0) {
      const result = await Lead_1.default.deleteMany(query);
      console.log(
        `Successfully deleted ${result.deletedCount} leads with "exclusive" in name or bidType`,
      );
    } else {
      console.log("No leads found to delete");
    }
  } catch (error) {
    console.error("Error deleting exclusive leads:", error);
  } finally {
    await mongoose_1.default.connection.close();
    console.log("MongoDB connection closed");
  }
}
// Run the deletion
deleteExclusiveLeads().catch(console.error);
