const { MongoClient } = require("mongodb");

// Connect to LOCAL MongoDB instance
const uri = "mongodb://localhost:27017";

async function checkLocalMongoDB() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to LOCAL MongoDB\n");

    // List all databases
    const adminDb = client.db().admin();
    const databasesList = await adminDb.listDatabases();

    console.log("=== LOCAL DATABASES ===");
    for (const db of databasesList.databases) {
      console.log(
        `\n📁 Database: ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`,
      );

      // Skip system databases
      if (db.name === "admin" || db.name === "config" || db.name === "local") {
        continue;
      }

      const database = client.db(db.name);
      const collections = await database.listCollections().toArray();

      for (const coll of collections) {
        const count = await database.collection(coll.name).countDocuments();
        console.log(`  - ${coll.name}: ${count} documents`);

        // Check for leads
        if (coll.name.toLowerCase().includes("lead")) {
          console.log(`    ✅ FOUND LEADS COLLECTION!`);

          // Get more details
          const leadsByStatus = await database
            .collection(coll.name)
            .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
            .toArray();

          console.log(`    Status breakdown:`);
          leadsByStatus.forEach((s) => {
            console.log(`      - ${s._id || "No status"}: ${s.count}`);
          });

          // Sample a lead
          const sampleLead = await database.collection(coll.name).findOne();
          if (sampleLead) {
            console.log(
              `    Sample lead fields: ${Object.keys(sampleLead).join(", ")}`,
            );
          }

          if (count > 1000) {
            console.log(
              `\n    🎯 THIS COULD BE YOUR 1.6K LEADS! (${count} total)`,
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error connecting to local MongoDB:", error.message);
    console.log("\nMake sure local MongoDB is running with:");
    console.log("mongod --dbpath ~/mongodb/data");
  } finally {
    await client.close();
  }
}

checkLocalMongoDB();
