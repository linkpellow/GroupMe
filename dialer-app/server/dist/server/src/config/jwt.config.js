"use strict";
/**
 * JWT Configuration
 * Centralized JWT configuration to ensure consistency across the application
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.JWT_EXPIRATION = exports.JWT_SECRET = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Load environment variables
dotenv_1.default.config();
dotenv_1.default.config({ path: '.env.local' });
// Use a single, consistent JWT secret across the entire application
exports.JWT_SECRET = process.env.JWT_SECRET || 'crokodialdialersecret2024';
// JWT token expiration time
exports.JWT_EXPIRATION = '30d';
// Validate JWT configuration on startup
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: Using default JWT_SECRET in production is not secure!');
}
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, exports.JWT_SECRET, { expiresIn: exports.JWT_EXPIRATION });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
    }
    catch (error) {
        console.error('JWT verification error:', error);
        throw error;
    }
};
exports.verifyToken = verifyToken;
