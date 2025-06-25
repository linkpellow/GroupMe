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
async function fixLeadOrders() {
  try {
    console.log("Starting lead order fix...");
    // Connect to MongoDB
    await mongoose_1.default.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");
    // Get admin user
    const admin = await User_1.default.findOne({ role: "admin" });
    if (!admin) {
      throw new Error("No admin user found");
    }
    // Find all leads assigned to admin
    const leads = await Lead_1.default
      .find({ assignedTo: admin._id })
      .sort({ createdAt: 1 });
    console.log(`Found ${leads.length} leads assigned to admin`);
    // Update order for each lead
    for (let i = 0; i < leads.length; i++) {
      await Lead_1.default.findByIdAndUpdate(leads[i]._id, { order: i });
      console.log(
        `Updated order for lead: ${leads[i].name} (${i + 1}/${leads.length})`,
      );
    }
    console.log("Lead order fix complete");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing lead orders:", error);
    process.exit(1);
  }
}
// Run the fix
fixLeadOrders();
