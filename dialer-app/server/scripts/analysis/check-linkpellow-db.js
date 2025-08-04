const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/linkpellow?retryWrites=true&w=majority&appName=linkpellow";

async function checkLinkpellowDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas - linkpellow database\n");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(
      `Found ${collections.length} collections in linkpellow database:\n`,
    );

    let totalLeads = 0;

    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`- ${coll.name}: ${count} documents`);

      if (coll.name.toLowerCase().includes("lead")) {
        totalLeads += count;
        console.log(`  ✅ This is a leads collection!`);

        // Show sample lead
        const sampleLead = await db.collection(coll.name).findOne();
        if (sampleLead) {
          console.log(
            `  Sample fields: ${Object.keys(sampleLead).slice(0, 10).join(", ")}...`,
          );
        }
      }

      if (coll.name === "users") {
        const users = await db
          .collection(coll.name)
          .find({})
          .limit(5)
          .toArray();
        console.log(`  Users:`);
        users.forEach((u) =>
          console.log(
            `    - ${u.email || u.username} (${u.name || "No name"})`,
          ),
        );
      }
    }

    console.log(`\n🎯 Total leads found: ${totalLeads}`);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkLinkpellowDatabase();
