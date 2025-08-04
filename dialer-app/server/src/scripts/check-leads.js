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
async function checkLeads() {
  try {
    console.log("Checking all leads in database...");
    // Connect to MongoDB
    await mongoose_1.default.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");
    // Find all leads
    const leads = await Lead_1.default.find({});
    console.log(`Total leads in database: ${leads.length}`);
    // Check for any leads with "exclusive"
    const exclusiveLeads = leads.filter(
      (lead) =>
        (lead.name && lead.name.toLowerCase().includes("exclusive")) ||
        (lead.firstName &&
          lead.firstName.toLowerCase().includes("exclusive")) ||
        (lead.lastName && lead.lastName.toLowerCase().includes("exclusive")) ||
        lead.bidType === "exclusive",
    );
    if (exclusiveLeads.length > 0) {
      console.log('\nFound leads with "exclusive":');
      exclusiveLeads.forEach((lead) => {
        console.log(`\nID: ${lead._id}`);
        console.log(`Name: ${lead.name}`);
        console.log(`First Name: ${lead.firstName}`);
        console.log(`Last Name: ${lead.lastName}`);
        console.log(`Bid Type: ${lead.bidType}`);
        console.log("---");
      });
    } else {
      console.log('\nNo leads found with "exclusive" in any field!');
    }
    // Show all remaining leads
    console.log("\nAll remaining leads:");
    leads.forEach((lead) => {
      console.log(`\nID: ${lead._id}`);
      console.log(`Name: ${lead.name}`);
      console.log(`First Name: ${lead.firstName}`);
      console.log(`Last Name: ${lead.lastName}`);
      console.log(`Phone: ${lead.phone}`);
      console.log("---");
    });
    await mongoose_1.default.connection.close();
    console.log("\nDatabase connection closed.");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}
checkLeads();
