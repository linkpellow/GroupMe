"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_CONFIG = exports.API_SID = void 0;
const crypto_1 = __importDefault(require("crypto"));
// Generate a secure SID if not already set
exports.API_SID = process.env.API_SID || 'crok_' + crypto_1.default.randomBytes(16).toString('hex');
// API configuration
exports.API_CONFIG = {
    version: 'v1',
    baseUrl: process.env.API_BASE_URL || 'https://crokodial-2a1145cec713.herokuapp.com',
    endpoints: {
        leads: '/api/v1/leads',
        auth: '/api/v1/auth',
        calls: '/api/v1/calls',
    },
};
// Export the configuration
exports.default = {
    sid: exports.API_SID,
    baseUrl: exports.API_CONFIG.baseUrl,
    endpoints: exports.API_CONFIG.endpoints,
    version: exports.API_CONFIG.version,
};
