const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Find all users
    const users = await usersCollection.find({}).toArray();

    console.log(`\nFound ${users.length} users in the database:\n`);

    users.forEach((user) => {
      console.log(`- Email: ${user.email}`);
      console.log(`  Username: ${user.username || "N/A"}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  ID: ${user._id}`);
      console.log("---");
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkUsers();
