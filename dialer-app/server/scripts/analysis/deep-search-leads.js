const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/?retryWrites=true&w=majority&appName=linkpellow";

async function deepSearchForLeads() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas\n");

    const adminDb = client.db().admin();
    const databasesList = await adminDb.listDatabases();

    console.log("=== DEEP SEARCH FOR LEADS DATA ===\n");

    for (const dbInfo of databasesList.databases) {
      // Skip system databases
      if (
        dbInfo.name === "admin" ||
        dbInfo.name === "config" ||
        dbInfo.name === "local"
      ) {
        continue;
      }

      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();

      for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();

        // Look for collections with significant data
        if (count > 100) {
          console.log(
            `\nChecking ${dbInfo.name}.${coll.name} (${count} documents)...`,
          );

          // Get a sample document to check structure
          const sample = await db.collection(coll.name).findOne();

          if (sample) {
            const fields = Object.keys(sample);

            // Check if it looks like lead data
            const leadIndicators = [
              "phone",
              "email",
              "firstName",
              "lastName",
              "name",
              "contact",
              "lead",
              "customer",
            ];
            const hasLeadFields = leadIndicators.some((indicator) =>
              fields.some((field) =>
                field.toLowerCase().includes(indicator.toLowerCase()),
              ),
            );

            if (hasLeadFields) {
              console.log(`  ✅ POTENTIAL LEAD DATA FOUND!`);
              console.log(`  Fields: ${fields.join(", ")}`);

              // Show a few sample records
              const samples = await db
                .collection(coll.name)
                .find({})
                .limit(3)
                .toArray();
              console.log(`  Sample records:`);
              samples.forEach((doc, i) => {
                const info = [];
                if (doc.name) info.push(`name: ${doc.name}`);
                if (doc.firstName) info.push(`firstName: ${doc.firstName}`);
                if (doc.lastName) info.push(`lastName: ${doc.lastName}`);
                if (doc.email) info.push(`email: ${doc.email}`);
                if (doc.phone) info.push(`phone: ${doc.phone}`);
                if (doc.phoneNumber)
                  info.push(`phoneNumber: ${doc.phoneNumber}`);
                console.log(`    ${i + 1}. ${info.join(", ")}`);
              });

              if (count > 1000) {
                console.log(
                  `\n  🎯 THIS COULD BE YOUR MAIN LEADS DATABASE! (${count} records)`,
                );
              }
            }
          }
        }
      }
    }

    // Also check for any collection with "lead" in the name regardless of count
    console.log('\n\n=== ALL COLLECTIONS WITH "LEAD" IN NAME ===');
    for (const dbInfo of databasesList.databases) {
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();

      for (const coll of collections) {
        if (coll.name.toLowerCase().includes("lead")) {
          const count = await db.collection(coll.name).countDocuments();
          console.log(`${dbInfo.name}.${coll.name}: ${count} documents`);
        }
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

deepSearchForLeads();
