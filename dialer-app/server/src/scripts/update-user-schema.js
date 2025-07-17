/**
 * This script updates the User collection to add the integrations field
 * Run with: node src/scripts/update-user-schema.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/dialer_app")
  .then(async () => {
    console.log("Connected to MongoDB");

    try {
      // Get the User model
      const User = mongoose.connection.collection("users");

      // Update all users to have an integrations field if they don't already
      const result = await User.updateMany(
        { integrations: { $exists: false } },
        { $set: { integrations: {} } },
      );

      console.log("Updated user schema with integrations field:", result);

      console.log("Script completed successfully");
    } catch (error) {
      console.error("Error updating user schema:", error);
    } finally {
      // Close the connection
      mongoose.connection.close();
    }
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
