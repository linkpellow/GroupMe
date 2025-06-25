// Aggressive script to fix all duplicate leads by email address
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

// MongoDB connection info
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/dialer_app";
const DB_NAME = "dialer_app";
const COLLECTION_NAME = "leads";

// Main function to fix duplicates
async function fixAllDuplicates() {
  let client;

  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB at ${MONGODB_URI}`);
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const leadsCollection = db.collection(COLLECTION_NAME);

    // Method 1: Use MongoDB aggregation to find exact duplicate emails
    console.log("Finding duplicate emails using MongoDB aggregation...");
    const duplicateEmails = await leadsCollection
      .aggregate([
        // Group by email and count occurrences
        { $match: { email: { $exists: true, $ne: "" } } },
        { $group: { _id: "$email", count: { $sum: 1 } } },
        // Filter for emails that appear more than once
        { $match: { count: { $gt: 1 } } },
        // Sort by count descending
        { $sort: { count: -1 } },
      ])
      .toArray();

    console.log(`Found ${duplicateEmails.length} emails with duplicates`);

    if (duplicateEmails.length === 0) {
      console.log("No duplicate emails found!");
    } else {
      console.log("\nProcessing duplicate emails:");

      let totalDuplicatesRemoved = 0;

      // Process each duplicate email
      for (const dupEmail of duplicateEmails) {
        const email = dupEmail._id;
        const count = dupEmail.count;

        // Find all leads with this email
        const leads = await leadsCollection
          .find({ email })
          .sort({ createdAt: 1 })
          .toArray();

        // The leads are sorted by createdAt, so keep the first one and delete the rest
        const leadToKeep = leads[0];
        const duplicates = leads.slice(1);
        const duplicateIds = duplicates.map((d) => d._id);

        console.log(
          `Email: ${email} | Duplicates: ${duplicates.length} | Keeping ID: ${leadToKeep._id}`,
        );

        if (duplicateIds.length > 0) {
          // Delete the duplicates
          const deleteResult = await leadsCollection.deleteMany({
            _id: { $in: duplicateIds.map((id) => new ObjectId(id)) },
          });

          console.log(`  - Deleted ${deleteResult.deletedCount} duplicates`);
          totalDuplicatesRemoved += deleteResult.deletedCount;
        }
      }

      console.log(`\nTotal duplicates removed: ${totalDuplicatesRemoved}`);
    }

    // Create a unique index on email to prevent future duplicates
    console.log("\nCreating unique index on email field...");

    try {
      await leadsCollection.createIndex(
        { email: 1 },
        {
          unique: true,
          sparse: true, // Skip documents where email is missing
          name: "email_unique_index",
        },
      );
      console.log(
        "Index created successfully! Future duplicates will be prevented automatically.",
      );
    } catch (indexError) {
      console.error("Error creating index:", indexError.message);
      if (indexError.message.includes("already exists")) {
        console.log("The unique index already exists.");
      }
    }

    console.log("\nChecking for any remaining duplicates...");
    const remainingDuplicates = await leadsCollection
      .aggregate([
        { $match: { email: { $exists: true, $ne: "" } } },
        { $group: { _id: "$email", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (remainingDuplicates.length > 0) {
      console.log(
        `WARNING: Found ${remainingDuplicates.length} emails with duplicates remaining.`,
      );
      console.log(
        "You may need to run this script again or investigate these entries manually:",
      );
      for (const dup of remainingDuplicates) {
        console.log(`  - ${dup._id}: ${dup.count} instances`);
      }
    } else {
      console.log("No duplicate emails remain! The database is clean.");
    }
  } catch (error) {
    console.error("Error fixing duplicate leads:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("Disconnected from MongoDB");
    }
  }
}

// Run the script
fixAllDuplicates()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
