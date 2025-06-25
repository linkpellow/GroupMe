/**
 * JWT Token Test Script
 * This tests that tokens can be generated and verified with the same secret.
 */

import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const SECRET = process.env.JWT_SECRET || "crokodialdialersecret2024";
console.log("Using secret:", SECRET);

// Create a test user
const testUser = { id: "123", name: "Test User", email: "user@example.com" };

// Sign a token
const token = jwt.sign(testUser, SECRET, { expiresIn: "2h" });
console.log("Generated token:", token);

try {
  // Verify the token
  const verified = jwt.verify(token, SECRET);
  console.log("Token verified successfully:", verified);
} catch (error) {
  console.error("Token verification failed:", error.message);
}

// The token should be a valid JWT with three parts separated by dots
const parts = token.split(".");
if (parts.length === 3) {
  console.log("Token has the correct JWT structure (header.payload.signature)");
} else {
  console.error("Token does not have the correct JWT structure");
}
