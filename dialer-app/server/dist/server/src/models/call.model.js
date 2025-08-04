"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Create schema with timestamps
const callSchema = new mongoose_1.default.Schema({
    lead: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Lead',
        required: false,
    },
    phone: {
        type: String,
        required: true,
    },
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        default: 'outbound',
    },
    duration: {
        type: Number,
        default: 0,
    },
    notes: {
        type: String,
        default: '',
    },
}, { timestamps: true }); // Ensure timestamps are enabled
const CallModel = mongoose_1.default.model('Call', callSchema);
exports.default = CallModel;
