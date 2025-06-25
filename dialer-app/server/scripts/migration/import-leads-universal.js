const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const csv = require("csv-parse/sync");

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
        leadSource: String,
        originalStatus: String,
        importedAt: Date,
        // Additional fields for marketplace leads
        address: String,
        city: String,
        state: String,
        zipcode: String,
        dateOfBirth: String,
      }),
    );

    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      console.log("\nUsage: node import-leads-universal.js <path-to-csv-file>");
      console.log(
        "Example: node import-leads-universal.js ../csv/my-leads.csv",
      );
      process.exit(1);
    }

    console.log(`Reading CSV file: ${csvPath}`);
    const fileContent = fs.readFileSync(csvPath, "utf-8");

    // Parse CSV with proper handling of quoted fields
    let records;
    try {
      records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        quote: '"',
        relax_quotes: true,
        relax_column_count: true,
      });
    } catch (parseError) {
      console.error("Error parsing CSV:", parseError.message);
      console.log("Attempting fallback parsing...");

      // Fallback to manual parsing if csv-parse fails
      const lines = fileContent.split("\n");
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));
      records = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line
          .split(",")
          .map((v) => v.trim().replace(/^"|"$/g, ""));
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || "";
        });
        records.push(record);
      }
    }

    console.log(`Found ${records.length} records in CSV`);
    if (records.length > 0) {
      console.log("Detected columns:", Object.keys(records[0]).join(", "));
    }

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

    console.log(`Found ${existingPhones.size} existing leads in database\n`);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      // Get phone number - try all possible column names
      const phone =
        row.Phone ||
        row.phone ||
        row.telephone ||
        row.Telephone ||
        row.mobile ||
        row.Mobile ||
        row["Phone Number"] ||
        row["Phone #"] ||
        row.primaryPhone ||
        row.PrimaryPhone ||
        "";

      if (!phone) {
        console.log(`Row ${i + 1}: Skipping - no phone number`);
        skipped++;
        continue;
      }

      // Clean phone number (remove any formatting)
      const cleanPhone = phone.replace(/[^\d]/g, "");

      // Skip if phone already exists
      if (existingPhones.has(phone) || existingPhones.has(cleanPhone)) {
        console.log(`Row ${i + 1}: Skipping - phone ${phone} already exists`);
        skipped++;
        continue;
      }

      try {
        // Handle name fields - support both formats
        let fullName = "";
        let firstName = "";
        let lastName = "";

        // Check for marketplace format (single "Name" field)
        if (row.Name || row.name) {
          fullName = row.Name || row.name;
          // Try to split into first and last name
          const nameParts = fullName.split(" ").filter((p) => p);
          if (nameParts.length > 0) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(" ");
          }
        }
        // Check for NextGen format (separate first_name/last_name fields)
        else {
          firstName =
            row.first_name ||
            row.firstName ||
            row.FirstName ||
            row.fname ||
            row["First Name"] ||
            "";
          lastName =
            row.last_name ||
            row.lastName ||
            row.LastName ||
            row.lname ||
            row["Last Name"] ||
            "";
          fullName = `${firstName} ${lastName}`.trim();
        }

        // If still no name, use a placeholder
        if (!fullName) {
          fullName = "No Name";
        }

        // Get email - try various column names
        const email =
          row.Email ||
          row.email ||
          row["Email Address"] ||
          row["E-mail"] ||
          `lead${Date.now()}_${i}@noemail.com`;

        // Get additional fields if available
        const leadSource =
          row["Lead Source"] ||
          row.leadSource ||
          row.source ||
          row.Source ||
          "CSV Import";
        const originalStatus = row.Status || row.status || "New";
        const createdTime =
          row["Created Time"] ||
          row.createdTime ||
          row.created_at ||
          row.createdAt ||
          row.created;

        // Get marketplace-specific fields
        const zipcode =
          row.zipcode ||
          row.postalCode ||
          row.PostalCode ||
          row.zip ||
          row.Zip ||
          row["Zip Code"] ||
          "";

        // Clean zipcode - remove .0 if present and ensure it's a string
        const cleanZipcode = zipcode.toString().replace(/\.0$/, "").trim();

        const dateOfBirth =
          row.dateOfBirth ||
          row.DateOfBirth ||
          row.dob ||
          row.DOB ||
          row["Date of Birth"] ||
          "";
        const state = row.state || row.State || row.ST || "";
        const city = row.city || row.City || "";
        const address =
          row.addressOne ||
          row.address ||
          row.Address ||
          row["Street Address"] ||
          "";

        // Build notes with any additional information
        const noteParts = [
          `Imported from ${path.basename(csvPath)} on ${new Date().toLocaleString()}`,
        ];

        if (leadSource && leadSource !== "CSV Import") {
          noteParts.push(`Lead Source: ${leadSource}`);
        }

        if (originalStatus && originalStatus !== "New") {
          noteParts.push(`Original Status: ${originalStatus}`);
        }

        if (createdTime) {
          noteParts.push(`Originally Created: ${createdTime}`);
        }

        if (dateOfBirth) {
          noteParts.push(`Date of Birth: ${dateOfBirth}`);
        }

        if (address) {
          noteParts.push(`Address: ${address}`);
        }

        if (city || state || zipcode) {
          noteParts.push(
            `Location: ${city}${city && state ? ", " : ""}${state} ${cleanZipcode}`.trim(),
          );
        }

        // Add any other fields that might be useful
        const excludedFields = [
          "Name",
          "name",
          "Email",
          "email",
          "Phone",
          "phone",
          "first_name",
          "firstName",
          "last_name",
          "lastName",
          "Lead Source",
          "Status",
          "Created Time",
          "ID",
          "id",
          "primaryPhone",
          "postalCode",
          "dateOfBirth",
          "addressOne",
          "city",
          "state",
          "zipcode",
        ];

        Object.keys(row).forEach((key) => {
          if (!excludedFields.includes(key) && row[key]) {
            noteParts.push(`${key}: ${row[key]}`);
          }
        });

        // Create the lead
        await Lead.create({
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          email: email,
          status: "New",
          source: "CSV Import",
          leadSource: leadSource,
          originalStatus: originalStatus,
          notes: noteParts.join("\n"),
          order: currentOrder++,
          importedAt: new Date(),
          address: address,
          city: city,
          state: state,
          zipcode: cleanZipcode,
          dateOfBirth: dateOfBirth,
        });

        imported++;
        existingPhones.add(phone);
        existingPhones.add(cleanPhone);
        console.log(
          `✅ Imported: ${fullName} (${phone}) - Source: ${leadSource}`,
        );
      } catch (error) {
        console.error(`❌ Error importing row ${i + 1}: ${error.message}`);
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

// Check if csv-parse is installed
try {
  require("csv-parse/sync");
} catch (e) {
  console.log("Installing required csv-parse package...");
  const { execSync } = require("child_process");
  execSync("npm install csv-parse", { stdio: "inherit", cwd: __dirname });
}

importLeads();
