"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = exports.generateSid = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateSid = () => {
    return 'crk_' + crypto_1.default.randomBytes(16).toString('hex'); // 32 hex chars
};
exports.generateSid = generateSid;
const generateApiKey = () => {
    return ('key_' + crypto_1.default.randomBytes(32).toString('hex') // 64 hex chars
    );
};
exports.generateApiKey = generateApiKey;
