const { MongoClient } = require("mongodb");

// Testing the linkpellow user
const uri =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/?retryWrites=true&w=majority&appName=linkpellow";

async function findAllDatabases() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas\n");

    // List all databases
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();

    console.log(`Found ${dbList.databases.length} databases:\n`);

    let totalLeadsAcrossAllDbs = 0;

    // Check each database for leads
    for (const dbInfo of dbList.databases) {
      const dbName = dbInfo.name;
      const db = client.db(dbName);

      try {
        // Check if leads collection exists
        const collections = await db
          .listCollections({ name: "leads" })
          .toArray();

        if (collections.length > 0) {
          const leadCount = await db.collection("leads").countDocuments({});
          totalLeadsAcrossAllDbs += leadCount;

          console.log(`📁 Database: ${dbName}`);
          console.log(`   - Leads: ${leadCount}`);

          if (leadCount > 1000) {
            console.log(
              `   🎯 POTENTIAL MATCH! This might be your database with ~2K leads!`,
            );

            // Get sample leads
            const sampleLeads = await db
              .collection("leads")
              .find({})
              .limit(3)
              .toArray();
            console.log("   Sample leads:");
            sampleLeads.forEach((lead) => {
              console.log(
                `     • ${lead.name || "No name"} - ${lead.phone || "No phone"}`,
              );
            });
          }

          // Check for users collection
          const userCollections = await db
            .listCollections({ name: "users" })
            .toArray();
          if (userCollections.length > 0) {
            const userCount = await db.collection("users").countDocuments({});
            console.log(`   - Users: ${userCount}`);
          }

          console.log("");
        }
      } catch (err) {
        // Skip databases we can't access
      }
    }

    console.log(
      `\n📊 TOTAL LEADS ACROSS ALL DATABASES: ${totalLeadsAcrossAllDbs}`,
    );

    if (totalLeadsAcrossAllDbs < 1000) {
      console.log(
        "\n⚠️  Could not find your ~2K leads in any database accessible by linkpellow:admin123",
      );
      console.log("Possible reasons:");
      console.log("1. The leads were deleted or archived");
      console.log("2. They are in a different MongoDB cluster");
      console.log(
        "3. They are under a different user account that we haven't found yet",
      );
      console.log(
        "4. The May logs were from a different environment (staging/production)",
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

findAllDatabases();
