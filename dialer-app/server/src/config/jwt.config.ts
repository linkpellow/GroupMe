/**
 * JWT Configuration
 * Centralized JWT configuration to ensure consistency across the application
 */

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

// Use a single, consistent JWT secret across the entire application
export const JWT_SECRET = process.env.JWT_SECRET || 'crokodialdialersecret2024';

// JWT token expiration time
export const JWT_EXPIRATION = '30d';

// Validate JWT configuration on startup
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: Using default JWT_SECRET in production is not secure!');
}

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('JWT verification error:', error);
    throw error;
  }
};
