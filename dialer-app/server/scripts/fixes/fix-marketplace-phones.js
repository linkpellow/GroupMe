const fs = require("fs");
const mongoose = require("mongoose");
const { parse } = require("csv-parse/sync");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

// CSV file path - update this if needed
const csvPath =
  process.argv[2] || "/Users/linkp/Downloads/lead-report-1748219134905.csv";

async function fixMarketplacePhones() {
  try {
    console.log("Reading CSV file:", csvPath);
    const fileContent = fs.readFileSync(csvPath, "utf-8");

    console.log("Parsing CSV...");
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      quote: '"',
      escape: '"',
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    });

    console.log(`Found ${records.length} records in CSV\n`);

    // Create a map of email to phone number from CSV
    const emailToPhone = {};
    const emailToFullData = {};

    records.forEach((record) => {
      const email = record.email || record.Email || "";
      const phone = record.primaryPhone || record.phone || record.Phone || "";

      if (email && phone) {
        emailToPhone[email.toLowerCase()] = phone;
        emailToFullData[email.toLowerCase()] = {
          phone: phone,
          firstName: record.firstName || "",
          lastName: record.lastName || "",
          city: record.city || "",
          state: record.state || "",
          zipcode: record.postalCode || record.zipcode || "",
          dob: record.dateOfBirth || record.dob || "",
          gender: record.gender || "",
          age: record.age || "",
          income: record.income || "",
          household: record.household || "",
        };
      }
    });

    console.log(
      `Created phone mapping for ${Object.keys(emailToPhone).length} emails\n`,
    );

    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Find all marketplace leads without phone numbers
    const marketplaceLeads = await db
      .collection("leads")
      .find({
        source: { $in: ["Marketplace", "marketplace"] },
        $or: [{ phone: "" }, { phone: null }, { phone: { $exists: false } }],
      })
      .toArray();

    console.log(
      `Found ${marketplaceLeads.length} marketplace leads without phone numbers\n`,
    );

    let fixedCount = 0;
    let notFoundCount = 0;

    // Update each lead
    for (const lead of marketplaceLeads) {
      const email = lead.email?.toLowerCase();

      if (email && emailToPhone[email]) {
        const fullData = emailToFullData[email];

        // Update the lead with phone and other missing data
        const updateData = {
          phone: fullData.phone,
        };

        // Only update fields that are empty in the database
        if (!lead.firstName && fullData.firstName)
          updateData.firstName = fullData.firstName;
        if (!lead.lastName && fullData.lastName)
          updateData.lastName = fullData.lastName;
        if (!lead.city && fullData.city) updateData.city = fullData.city;
        if (!lead.state && fullData.state) updateData.state = fullData.state;
        if (!lead.zipcode && fullData.zipcode)
          updateData.zipcode = fullData.zipcode;
        if (!lead.dob && fullData.dob) updateData.dob = fullData.dob;
        if (!lead.gender && fullData.gender)
          updateData.gender = fullData.gender;
        if (!lead.age && fullData.age) updateData.age = fullData.age;
        if (!lead.income && fullData.income)
          updateData.income = fullData.income;
        if (!lead.household && fullData.household)
          updateData.household = fullData.household;

        await db
          .collection("leads")
          .updateOne({ _id: lead._id }, { $set: updateData });

        console.log(
          `✅ Fixed: ${lead.name} (${email}) - Phone: ${fullData.phone}`,
        );
        fixedCount++;
      } else {
        console.log(`❌ No phone found for: ${lead.name} (${email})`);
        notFoundCount++;
      }
    }

    console.log(`\n\n=== SUMMARY ===`);
    console.log(`✅ Fixed ${fixedCount} leads with phone numbers`);
    console.log(
      `❌ Could not fix ${notFoundCount} leads (email not found in CSV)`,
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run the fix
fixMarketplacePhones();
