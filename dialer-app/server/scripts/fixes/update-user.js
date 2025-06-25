// Script to update user email and password
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const mongo_uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/dialer_app";
const newEmail = "linkpellow@crokodial.com";
const newPassword = "9526Toast$";

// Hash the new password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function updateUser() {
  let client;
  try {
    client = await MongoClient.connect(mongo_uri);
    console.log("Connected to MongoDB");

    const db = client.db();

    // List all users first
    console.log("Listing all users in the database:");
    const users = await db.collection("users").find({}).toArray();

    if (users.length === 0) {
      console.log("No users found in the database");
      return;
    }

    users.forEach((user, index) => {
      console.log(
        `[${index}] _id: ${user._id}, email: ${user.email}, role: ${user.role || "N/A"}`,
      );
    });

    // Find the admin user
    const adminUser = users.find((user) => user.role === "admin");

    if (!adminUser) {
      console.log("No admin user found");
      return;
    }

    console.log("Found admin user:", adminUser.email);

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's email and password
    const result = await db.collection("users").updateOne(
      { _id: adminUser._id },
      {
        $set: {
          email: newEmail,
          password: hashedPassword,
          username: newEmail,
        },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(
        `User updated successfully! Changed email from ${adminUser.email} to ${newEmail}`,
      );
    } else {
      console.log("No changes made to the user");
    }
  } catch (error) {
    console.error("Error updating user:", error);
  } finally {
    if (client) {
      client.close();
      console.log("MongoDB connection closed");
    }
  }
}

updateUser();
