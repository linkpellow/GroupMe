"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const callSchema = new mongoose_1.Schema({
    twilioSid: { type: String, required: true, unique: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    agent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    lead: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead' },
    duration: { type: Number, default: 0 },
    recordingUrl: { type: String },
}, { timestamps: true });
// Indexes for faster queries
callSchema.index({ agent: 1, createdAt: -1 });
callSchema.index({ lead: 1, createdAt: -1 });
const CallModel = mongoose_1.default.model('Call', callSchema);
exports.default = CallModel;
