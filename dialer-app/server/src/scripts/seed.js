"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_js_1 = __importDefault(require("../models/User.js"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/dialer_app";
async function seed() {
  try {
    await mongoose_1.default.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    // Create admin user
    const adminUser = await User_js_1.default.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      role: "admin",
    });
    console.log("Admin user created:", adminUser);
    await mongoose_1.default.disconnect();
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}
seed();
