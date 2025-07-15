"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_field_encryption_1 = require("mongoose-field-encryption");
const dotenv_1 = __importDefault(require("dotenv"));
// Ensure env loaded (in case not yet)
dotenv_1.default.config();
const userSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    phone: { type: String },
    profilePicture: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    // Gmail integration fields
    gmailAccessToken: { type: String },
    gmailRefreshToken: { type: String },
    gmailTokenExpiry: { type: Date },
    gmailConnected: { type: Boolean, default: false },
    gmailEmail: { type: String },
    // GroupMe integration fields
    groupMe: {
        accessToken: { type: String },
        connectedAt: { type: Date },
        groups: { type: Map, of: String },
        email: { type: String },
        name: { type: String },
    },
    // TextDrip integration fields
    textdrip: {
        baseUrl: { type: String },
        username: { type: String },
        apiKey: { type: String },
        accessToken: { type: String },
        refreshToken: { type: String },
        tokenExpires: { type: Date },
        connectedAt: { type: Date },
    },
    // Integrations object
    integrations: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
});
// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Field-level encryption for sensitive TextDrip creds
const ENC_SECRET = process.env.ENCRYPTION_SECRET || 'default_please_override';
userSchema.plugin(mongoose_field_encryption_1.fieldEncryption, {
    fields: ['textdrip.apiKey', 'textdrip.username'],
    secret: ENC_SECRET,
    saltGenerator: (secret) => secret.slice(0, 16), // deterministic salt for symmetric decrypt
});
exports.default = (0, mongoose_1.model)('User', userSchema);
