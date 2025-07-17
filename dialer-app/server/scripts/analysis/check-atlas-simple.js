const mongoose = require("mongoose");
require("dotenv").config();

// Try different database names
const databases = [
  "dialer_app",
  "test",
  "crokodial",
  "linkpellow",
  "production",
];

async function checkDatabase(dbName) {
  const uri = `mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=linkpellow`;

  try {
    await mongoose.connect(uri);
    console.log(`\n✅ Connected to database: ${dbName}`);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(`Found ${collections.length} collections:`);

    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`  - ${coll.name}: ${count} documents`);

      // Check for leads
      if (coll.name === "leads" || coll.name.includes("lead")) {
        console.log(`    ✅ FOUND LEADS COLLECTION!`);
        const sampleLead = await db.collection(coll.name).findOne();
        if (sampleLead) {
          console.log(
            `    Sample lead: ${JSON.stringify(Object.keys(sampleLead))}`,
          );
        }
      }

      // Check for users
      if (coll.name === "users") {
        const users = await db
          .collection(coll.name)
          .find({})
          .limit(5)
          .toArray();
        console.log(`    Users found:`);
        users.forEach((u) => console.log(`      - ${u.email} (${u.name})`));
      }
    }

    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log(`❌ Could not connect to database: ${dbName}`);
    return false;
  }
}

async function findDatabase() {
  console.log("Searching for your database with leads...");

  for (const dbName of databases) {
    const found = await checkDatabase(dbName);
    if (found) {
      console.log(`\n🎯 Database "${dbName}" exists and is accessible!`);
    }
  }
}

findDatabase();
