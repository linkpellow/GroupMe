// Script to fix duplicate leads without relying on TypeScript
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
require("dotenv").config();

// MongoDB connection info
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/dialer_app";
const DB_NAME = "dialer_app";
const COLLECTION_NAME = "leads";

// Function to calculate a hash from lead data
function calculateLeadHash(lead) {
  // Create a hash based on email (primarily) and name/phone as secondary identifiers
  const data = `${lead.email || ""}|${lead.name || ""}|${lead.phone || ""}`;
  return crypto.createHash("md5").update(data).digest("hex");
}

// Main function to fix duplicates
async function fixDuplicateLeads() {
  let client;

  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB at ${MONGODB_URI}`);
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const leadsCollection = db.collection(COLLECTION_NAME);

    // 1. Get all leads
    console.log("Fetching all leads...");
    const allLeads = await leadsCollection.find({}).toArray();
    console.log(`Found ${allLeads.length} total leads`);

    // 2. Process marketplace leads first (since that's where duplicates are coming from)
    const marketplaceLeads = allLeads.filter(
      (lead) =>
        lead.source === "Marketplace" ||
        (lead.notes && lead.notes.includes("Marketplace")),
    );

    console.log(`Found ${marketplaceLeads.length} marketplace leads`);

    // 3. Group leads by hash
    const leadsByHash = {};
    const dupHashes = new Set();

    // First, group all leads by their hash
    marketplaceLeads.forEach((lead) => {
      const hash = calculateLeadHash(lead);

      // Initialize the array if it doesn't exist
      if (!leadsByHash[hash]) {
        leadsByHash[hash] = [];
      } else {
        // If we already have a lead with this hash, it's a duplicate
        dupHashes.add(hash);
      }

      // Add this lead to the hash group
      leadsByHash[hash].push(lead);
    });

    console.log(`Found ${dupHashes.size} hashes with duplicate leads`);

    // 4. Process duplicates
    let totalDuplicates = 0;
    const duplicatesToRemove = [];

    for (const hash of dupHashes) {
      const group = leadsByHash[hash];

      // Sort the leads by date (oldest first)
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Keep the oldest lead, mark the rest for deletion
      const leadToKeep = group[0];
      const duplicates = group.slice(1);

      console.log(
        `Hash: ${hash} | Email: ${leadToKeep.email || "N/A"} | Duplicates: ${duplicates.length}`,
      );
      totalDuplicates += duplicates.length;

      // Add duplicate IDs to our removal list
      duplicatesToRemove.push(...duplicates.map((d) => d._id));
    }

    console.log(
      `\nFound ${totalDuplicates} duplicate marketplace leads to remove`,
    );

    if (totalDuplicates > 0) {
      // 5. Remove the duplicates
      const result = await leadsCollection.deleteMany({
        _id: { $in: duplicatesToRemove },
      });
      console.log(`Deleted ${result.deletedCount} duplicate leads`);
    } else {
      console.log("No duplicates to delete!");
    }

    // 6. Create a unique index on email + source composite key to prevent future duplicates
    console.log(
      "\nCreating unique compound index on email+source fields for marketplace leads...",
    );
    try {
      // This compound index will enforce uniqueness for the combination of email and source
      // This is more reliable than a partial index with complex expressions
      await leadsCollection.createIndex(
        { email: 1, source: 1 },
        {
          unique: true,
          sparse: true, // Skip documents where either email or source is missing
          name: "marketplace_email_source_unique",
        },
      );
      console.log(
        "Index created successfully! Future duplicates will be prevented automatically.",
      );
    } catch (indexError) {
      console.error("Error creating index:", indexError.message);
      console.log(
        'Note: If error mentions "already exists", the index is already in place.',
      );
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
fixDuplicateLeads()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
