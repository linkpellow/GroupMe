// Script to list all collections in the MongoDB database
const { MongoClient } = require("mongodb");

const mongo_uri =
  process.env.MONGO_URI || "mongodb://localhost:27017/crokodial";

async function listCollections() {
  let client;
  try {
    client = await MongoClient.connect(mongo_uri);
    console.log("Connected to MongoDB");

    const db = client.db();

    // List all collections
    console.log("Listing all collections in the database:");
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log("No collections found in the database");
      return;
    }

    collections.forEach((collection, index) => {
      console.log(`[${index}] ${collection.name}`);
    });

    // For each collection, count the documents
    console.log("\nDocument counts:");
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`${collection.name}: ${count} documents`);
    }
  } catch (error) {
    console.error("Error listing collections:", error);
  } finally {
    if (client) {
      client.close();
      console.log("MongoDB connection closed");
    }
  }
}

listCollections();
