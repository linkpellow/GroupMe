const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Get the CSV file path from command line argument or use default
const csvPath =
  process.argv[2] || path.join(__dirname, "../csv/your-leads.csv");

async function importLeads() {
  try {
    // Using the working credentials
    const mongoUri =
      "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Import the Lead model
    const Lead = mongoose.model(
      "Lead",
      new mongoose.Schema({
        name: String,
        firstName: String,
        lastName: String,
        phone: { type: String, required: true },
        email: String,
        status: { type: String, default: "New" },
        source: { type: String, default: "CSV Import" },
        notes: String,
        createdAt: { type: Date, default: Date.now },
        order: Number,
      }),
    );

    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      console.log("\nUsage: node import-leads-fixed.js <path-to-csv-file>");
      console.log("Example: node import-leads-fixed.js ../csv/my-leads.csv");
      process.exit(1);
    }

    console.log(`Reading CSV file: ${csvPath}`);
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

    console.log(`Found ${lines.length - 1} rows in CSV`);
    console.log(`Headers: ${headers.join(", ")}`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Get the highest order number
    const maxOrderLead = await Lead.findOne().sort({ order: -1 });
    let currentOrder = (maxOrderLead?.order || 0) + 1;

    // Track processed phones to avoid duplicates
    const existingPhones = new Set();
    const existingLeads = await Lead.find({}, "phone");
    existingLeads.forEach((lead) => existingPhones.add(lead.phone));

    console.log(`Found ${existingPhones.size} existing leads in database`);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",");
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });

      // Get phone number - try different possible column names
      const phone =
        row.phone ||
        row.Phone ||
        row.telephone ||
        row.Telephone ||
        row.mobile ||
        row.Mobile ||
        "";

      if (!phone) {
        console.log(`Row ${i}: Skipping - no phone number`);
        skipped++;
        continue;
      }

      // Skip if phone already exists
      if (existingPhones.has(phone)) {
        console.log(`Row ${i}: Skipping - phone ${phone} already exists`);
        skipped++;
        continue;
      }

      try {
        // Get name fields - try different possible column names
        const firstName =
          row.first_name || row.firstName || row.FirstName || row.fname || "";
        const lastName =
          row.last_name || row.lastName || row.LastName || row.lname || "";
        const fullName =
          row.name ||
          row.Name ||
          `${firstName} ${lastName}`.trim() ||
          "No Name";
        const email = row.email || row.Email || `lead${i}@noemail.com`;

        // Create the lead
        await Lead.create({
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          email: email,
          status: "New",
          source: "CSV Import",
          notes: `Imported from ${path.basename(csvPath)} on ${new Date().toLocaleString()}`,
          order: currentOrder++,
        });

        imported++;
        existingPhones.add(phone);
        console.log(`✅ Imported: ${fullName} (${phone})`);
      } catch (error) {
        console.error(`❌ Error importing row ${i}: ${error.message}`);
        errors++;
      }
    }

    console.log("\n========== IMPORT SUMMARY ==========");
    console.log(`✅ Successfully imported: ${imported} leads`);
    console.log(`⏭️  Skipped (duplicates/no phone): ${skipped} rows`);
    console.log(`❌ Errors: ${errors} rows`);
    console.log(
      `📊 Total leads now in database: ${existingPhones.size + imported}`,
    );
    console.log("====================================\n");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

importLeads();
