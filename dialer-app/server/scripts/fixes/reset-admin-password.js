const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://linkpellow:admin123@linkpellow.ygw6y.mongodb.net/dialer_app?retryWrites=true&w=majority&appName=linkpellow";

async function resetAdminPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Hash the new password
    const newPassword = "admin123";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the admin user's password
    const result = await usersCollection.updateOne(
      { email: "admin@crokodial.com" },
      { $set: { password: hashedPassword } },
    );

    if (result.modifiedCount > 0) {
      console.log("\n✅ Password reset successfully!");
      console.log("You can now login with:");
      console.log("Email: admin@crokodial.com");
      console.log("Password: admin123");
    } else {
      console.log("\n❌ No user found or password not changed");
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

resetAdminPassword();
