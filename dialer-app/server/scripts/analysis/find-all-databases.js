const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/?retryWrites=true&w=majority&appName=linkpellow";

async function findAllDatabases() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas\n");

    // Get the admin database
    const adminDb = client.db().admin();

    // Try to list databases - this might fail due to permissions
    try {
      const databasesList = await adminDb.listDatabases();
      console.log("=== ALL DATABASES ===");
      for (const db of databasesList.databases) {
        console.log(
          `\nDatabase: ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`,
        );
      }
    } catch (e) {
      console.log(
        "Cannot list all databases (permission denied). Checking known databases...\n",
      );
    }

    // Check specific database names that might contain your data
    const possibleDatabases = [
      "dialer_app",
      "test",
      "crokodial",
      "linkpellow",
      "production",
      "prod",
      "main",
      "app",
      "dialer",
      "crm",
      "leads",
      "default",
    ];

    console.log("=== CHECKING DATABASES FOR LEADS ===");

    for (const dbName of possibleDatabases) {
      try {
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();

        if (collections.length > 0) {
          console.log(
            `\n✅ Database "${dbName}" exists with ${collections.length} collections:`,
          );

          let totalLeads = 0;
          for (const coll of collections) {
            const count = await db.collection(coll.name).countDocuments();

            if (coll.name.toLowerCase().includes("lead")) {
              console.log(`  - ${coll.name}: ${count} documents 🎯`);
              totalLeads += count;
            } else if (coll.name === "users") {
              console.log(`  - ${coll.name}: ${count} users`);
              const users = await db
                .collection(coll.name)
                .find({})
                .limit(3)
                .toArray();
              users.forEach((u) =>
                console.log(`    • ${u.email || u.username || u.name}`),
              );
            } else {
              console.log(`  - ${coll.name}: ${count} documents`);
            }
          }

          if (totalLeads > 1000) {
            console.log(
              `\n🎯 FOUND IT! Database "${dbName}" has ${totalLeads} leads!`,
            );
          }
        }
      } catch (e) {
        // Database doesn't exist or no permissions
      }
    }
  } catch (error) {
    console.error("Connection error:", error.message);
  } finally {
    await client.close();
  }
}

findAllDatabases();
