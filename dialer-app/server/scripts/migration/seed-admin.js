const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/dialer_app";

async function createAdminUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Define User schema inline to avoid import issues
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ["admin", "agent"], default: "agent" },
      profilePicture: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    // Hash password before saving
    userSchema.pre("save", async function (next) {
      if (!this.isModified("password")) return next();
      this.password = await bcrypt.hash(this.password, 10);
      next();
    });

    const User = mongoose.models.User || mongoose.model("User", userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@crokodial.com" });
    if (existingAdmin) {
      console.log("Admin user already exists");
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@crokodial.com",
      username: "admin",
      password: "admin123",
      role: "admin",
    });

    console.log("Admin user created successfully:", {
      name: adminUser.name,
      email: adminUser.email,
      username: adminUser.username,
      role: adminUser.role,
    });

    await mongoose.disconnect();
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser();
