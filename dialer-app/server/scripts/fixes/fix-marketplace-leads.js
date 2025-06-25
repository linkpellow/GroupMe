const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const csv = require("csv-parse/sync");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

// Get the CSV file path from command line argument
const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Please provide the path to the marketplace CSV file");
  console.log("Usage: node fix-marketplace-leads.js <path-to-csv>");
  process.exit(1);
}

async function fixMarketplaceLeads() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found: ${csvPath}`);
      process.exit(1);
    }

    console.log(`Reading CSV file: ${csvPath}`);
    const fileContent = fs.readFileSync(csvPath, "utf-8");

    // Parse CSV
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      quote: '"',
      relax_quotes: true,
      relax_column_count: true,
    });

    console.log(`Found ${records.length} records in CSV\n`);

    let updated = 0;
    let notFound = 0;
    let alreadyHasPhone = 0;

    // Create email to record map for quick lookup
    const emailToRecord = {};
    records.forEach((record) => {
      if (record.email) {
        emailToRecord[record.email.toLowerCase()] = record;
      }
    });

    // Get all leads without phone numbers
    const phonelessLeads = await db
      .collection("leads")
      .find({
        $or: [{ phone: "" }, { phone: null }, { phone: { $exists: false } }],
      })
      .toArray();

    console.log(`Found ${phonelessLeads.length} leads without phone numbers\n`);

    for (const lead of phonelessLeads) {
      const csvRecord = emailToRecord[lead.email?.toLowerCase()];

      if (!csvRecord) {
        console.log(`❌ No CSV match for: ${lead.name} (${lead.email})`);
        notFound++;
        continue;
      }

      // Get phone from CSV
      const phone =
        csvRecord.primaryPhone ||
        csvRecord.PrimaryPhone ||
        csvRecord.phone ||
        csvRecord.Phone ||
        "";

      if (!phone) {
        console.log(
          `⚠️  CSV record has no phone for: ${lead.name} (${lead.email})`,
        );
        continue;
      }

      // Get other fields
      const updateData = {
        phone: phone,
        address: csvRecord.addressOne || lead.address || "",
        city: csvRecord.city || lead.city || "",
        state: csvRecord.state || lead.state || "",
        zipcode:
          csvRecord.postalCode || csvRecord.zipcode || lead.zipcode || "",
        dateOfBirth: csvRecord.dateOfBirth || lead.dateOfBirth || "",
      };

      // Update the lead
      await db
        .collection("leads")
        .updateOne({ _id: lead._id }, { $set: updateData });

      console.log(
        `✅ Updated: ${lead.name} - Phone: ${phone}, Location: ${updateData.city}, ${updateData.state} ${updateData.zipcode}`,
      );
      updated++;
    }

    // Also check leads that might have other missing data
    console.log("\nChecking for leads with phone but missing other data...\n");

    const leadsWithPhone = await db
      .collection("leads")
      .find({
        phone: { $exists: true, $ne: "", $ne: null },
        source: "Marketplace",
      })
      .toArray();

    let additionalUpdates = 0;

    for (const lead of leadsWithPhone) {
      const csvRecord = emailToRecord[lead.email?.toLowerCase()];

      if (!csvRecord) continue;

      const updates = {};

      // Check if any fields need updating
      if (!lead.address && csvRecord.addressOne)
        updates.address = csvRecord.addressOne;
      if (!lead.city && csvRecord.city) updates.city = csvRecord.city;
      if (!lead.state && csvRecord.state) updates.state = csvRecord.state;
      if (!lead.zipcode && (csvRecord.postalCode || csvRecord.zipcode)) {
        updates.zipcode = csvRecord.postalCode || csvRecord.zipcode;
      }
      if (!lead.dateOfBirth && csvRecord.dateOfBirth)
        updates.dateOfBirth = csvRecord.dateOfBirth;

      if (Object.keys(updates).length > 0) {
        await db
          .collection("leads")
          .updateOne({ _id: lead._id }, { $set: updates });
        console.log(
          `📝 Updated additional fields for: ${lead.name} - ${Object.keys(updates).join(", ")}`,
        );
        additionalUpdates++;
      }
    }

    console.log("\n========== UPDATE SUMMARY ==========");
    console.log(`✅ Updated ${updated} leads with phone numbers`);
    console.log(`📝 Updated ${additionalUpdates} leads with additional data`);
    console.log(`❌ Could not find CSV data for ${notFound} leads`);

    // Final count
    const finalPhonelessCount = await db.collection("leads").countDocuments({
      $or: [{ phone: "" }, { phone: null }, { phone: { $exists: false } }],
    });

    console.log(`\n📊 Remaining leads without phone: ${finalPhonelessCount}`);
    console.log("====================================\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the fix
fixMarketplaceLeads();
