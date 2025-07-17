"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const csv_parse_1 = require("csv-parse");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const Lead_1 = __importDefault(require("../models/Lead"));
// Load environment variables
dotenv_1.default.config();
async function importCSV(filePath) {
  try {
    console.log("Starting CSV import for:", filePath);
    // Connect to MongoDB
    await mongoose_1.default.connect(process.env.MONGODB_URI || "");
    console.log("Connected to MongoDB");
    // Find admin user
    const admin = await User_1.default.findOne({ role: "admin" });
    if (!admin) {
      throw new Error("No admin user found");
    }
    // Read and parse CSV file
    const fileContent = fs_1.default.readFileSync(filePath, "utf-8");
    const records = [];
    await new Promise((resolve, reject) => {
      (0, csv_parse_1.parse)(
        fileContent,
        {
          columns: true,
          skip_empty_lines: true,
        },
        (err, data) => {
          if (err) reject(err);
          else {
            records.push(...data);
            resolve(null);
          }
        },
      );
    });
    console.log(`Found ${records.length} leads to process`);
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    for (const record of records) {
      try {
        // Check if lead already exists
        const existingLead = await Lead_1.default.findOne({
          $or: [{ phone: record.phone }, { email: record.email }],
        });
        // Build the full name
        const firstName = record.first_name || "";
        const lastName = record.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim() || "Unknown";
        // Map all fields from CSV to lead model
        const leadData = {
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          phone: record.phone,
          email: record.email || `${Date.now()}@noemail.com`,
          // Map required fields for lead cards
          zipcode: record.zipcode || "",
          dob: record.dob || "",
          height: record.height || "",
          weight: record.weight || "",
          gender: record.gender || "",
          state: record.state ? record.state.toUpperCase() : "",
          // Additional fields
          city: record.city || "",
          street1: record.street_1 || "",
          street2: record.street_2 || "",
          householdSize: record.household_size || "",
          householdIncome: record.household_income || "",
          military: record.military === "true",
          pregnant: record.pregnant === "true",
          tobaccoUser: record.tobacco_user === "true",
          hasPrescription: record.has_prescription === "true",
          hasMedicarePartsAB: record.has_medicare_parts_a_b === "true",
          hasMedicalCondition: record.has_medical_condition === "true",
          medicalConditions: record.medical_conditions
            ? JSON.parse(record.medical_conditions)
            : [],
          insuranceTimeframe: record.insurance_timeframe || "",
          // Source tracking
          campaignName: record.campaign_name || "",
          product: record.product || "",
          vendorName: record.vendor_name || "",
          accountName: record.account_name || "",
          bidType: record.bid_type || "",
          price: record.price || "",
          // Lead status
          status: "New",
          source: "NextGen",
          disposition: "",
          // Save raw data for reference
          notes: JSON.stringify(record),
          assignedTo: admin._id,
        };
        if (!existingLead) {
          await Lead_1.default.create(leadData);
          importedCount++;
          console.log("Created new lead:", leadData.name);
        } else {
          // For existing leads, update all fields
          await Lead_1.default.findByIdAndUpdate(existingLead._id, leadData);
          updatedCount++;
          console.log("Updated existing lead:", leadData.name);
        }
      } catch (error) {
        errorCount++;
        console.error("Error processing lead:", error, "Record:", record);
      }
    }
    console.log("Import completed:", {
      file: path_1.default.basename(filePath),
      imported: importedCount,
      updated: updatedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("Import error:", error);
  }
}
// Import both CSV files
async function importAllCSVs() {
  const csvDir = path_1.default.join(__dirname, "../../../csv");
  const files = [
    "purchases-2025-02-03-to-2025-03-23.csv",
    "purchases-2025-02-03-to-2025-03-22 (1).csv",
  ];
  for (const file of files) {
    await importCSV(path_1.default.join(csvDir, file));
  }
  // Close MongoDB connection
  await mongoose_1.default.connection.close();
  console.log("All imports completed");
}
// Run the import
importAllCSVs().catch(console.error);
