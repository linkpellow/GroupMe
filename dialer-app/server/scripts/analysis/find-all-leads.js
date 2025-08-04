const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/?retryWrites=true&w=majority&appName=linkpellow";

async function findAllLeads() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas\n");

    const adminDb = client.db().admin();
    const databasesList = await adminDb.listDatabases();

    console.log(
      "=== SEARCHING ALL DATABASES FOR COLLECTIONS WITH 1000+ DOCUMENTS ===\n",
    );

    for (const dbInfo of databasesList.databases) {
      const db = client.db(dbInfo.name);

      try {
        const collections = await db.listCollections().toArray();

        for (const coll of collections) {
          const count = await db.collection(coll.name).countDocuments();

          if (count > 1000) {
            console.log(`\n🎯 FOUND LARGE COLLECTION!`);
            console.log(`   Database: ${dbInfo.name}`);
            console.log(`   Collection: ${coll.name}`);
            console.log(`   Document count: ${count}`);

            // Get a sample document
            const sample = await db.collection(coll.name).findOne();
            if (sample) {
              console.log(`   Fields: ${Object.keys(sample).join(", ")}`);

              // Check if it looks like lead data
              const leadFields = [
                "phone",
                "email",
                "name",
                "firstName",
                "lastName",
                "contact",
              ];
              const hasLeadFields = leadFields.some((field) =>
                sample.hasOwnProperty(field),
              );

              if (hasLeadFields) {
                console.log(`   ✅ This looks like lead data!`);

                // Show some sample data
                const samples = await db
                  .collection(coll.name)
                  .find({})
                  .limit(3)
                  .toArray();
                console.log(`   Sample records:`);
                samples.forEach((doc, i) => {
                  const info = [];
                  if (doc.name) info.push(`name: ${doc.name}`);
                  if (doc.firstName) info.push(`firstName: ${doc.firstName}`);
                  if (doc.email) info.push(`email: ${doc.email}`);
                  if (doc.phone) info.push(`phone: ${doc.phone}`);
                  console.log(`     ${i + 1}. ${info.join(", ")}`);
                });
              }
            }
          }
        }
      } catch (e) {
        // Skip if no permissions
      }
    }

    // Also specifically check dialer_app database with different queries
    console.log("\n\n=== DETAILED CHECK OF DIALER_APP DATABASE ===");
    const dialerDb = client.db("dialer_app");

    // Try different collection names
    const possibleCollections = [
      "leads",
      "Leads",
      "lead",
      "contacts",
      "customers",
      "prospects",
    ];

    for (const collName of possibleCollections) {
      try {
        const count = await dialerDb.collection(collName).countDocuments();
        if (count > 0) {
          console.log(`\n${collName}: ${count} documents`);
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

findAllLeads();
