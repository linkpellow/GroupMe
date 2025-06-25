const mongoose = require("mongoose");
require("dotenv").config();

// Connect without specifying a database to see all databases
const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/?retryWrites=true&w=majority&appName=linkpellow";

async function checkDatabases() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    const adminDb = mongoose.connection.db.admin();

    // List all databases
    const result = await adminDb.listDatabases();
    console.log("\n=== Available Databases ===");

    for (const db of result.databases) {
      console.log(
        `\nDatabase: ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`,
      );

      // Connect to each database and list collections
      const database = mongoose.connection.useDb(db.name);
      const collections = await database.db.listCollections().toArray();

      if (collections.length > 0) {
        console.log("  Collections:");
        for (const coll of collections) {
          const count = await database.db
            .collection(coll.name)
            .countDocuments();
          console.log(`    - ${coll.name} (${count} documents)`);

          // If it's a users collection, show sample user
          if (coll.name === "users" && count > 0) {
            const sampleUser = await database.db
              .collection(coll.name)
              .findOne();
            console.log(
              `      Sample user: ${sampleUser.email || sampleUser.name}`,
            );
          }

          // If it's a leads collection, show count
          if (coll.name === "leads" && count > 0) {
            console.log(`      ✅ Found leads collection with ${count} leads!`);
          }
        }
      }
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDatabases();
