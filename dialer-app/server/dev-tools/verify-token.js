/**
 * Token verification script
 * Verifies a specific token is valid
 */

import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const SECRET = process.env.JWT_SECRET || "crokodialdialersecret2024";
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIiLCJpYXQiOjE3NDc0MDM5MjEsImV4cCI6MTc0NzQxMTEyMX0.4zHYVCW2iJffFyF2FQQlTh9XOk567PoRaCrju5sITYI";

try {
  // Verify a token from the auth/login endpoint
  const verified = jwt.verify(token, SECRET);
  console.log("✅ Token from auth/login is valid!");
  console.log(verified);
} catch (error) {
  console.error("❌ Token verification failed:", error.message);
}
