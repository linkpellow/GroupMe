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
const User_1 = __importDefault(require("../models/User"));
// Load environment variables
dotenv_1.default.config();
async function reassignLeads() {
  try {
    console.log("Starting lead reassignment...");
    // Connect to MongoDB
    await mongoose_1.default.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");
    // Get admin user
    const admin = await User_1.default.findOne({ role: "admin" });
    if (!admin) {
      throw new Error("No admin user found");
    }
    // Find all leads
    const leads = await Lead_1.default.find({});
    console.log(`Found ${leads.length} total leads`);
    // Update each lead to be assigned to admin
    for (const lead of leads) {
      await Lead_1.default.findByIdAndUpdate(lead._id, {
        assignedTo: admin._id,
        updatedAt: new Date(),
      });
      console.log(`Reassigned lead: ${lead.name}`);
    }
    console.log("Lead reassignment complete");
    process.exit(0);
  } catch (error) {
    console.error("Error reassigning leads:", error);
    process.exit(1);
  }
}
// Run the reassignment
reassignLeads();
