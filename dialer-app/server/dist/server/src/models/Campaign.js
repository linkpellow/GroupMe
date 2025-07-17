"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const campaignStepSchema = new mongoose_1.Schema({
    templateId: { type: String, required: true },
    delayDays: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
    },
    sentAt: { type: Date },
    messageIds: [{ type: String }], // Store Gmail message IDs
    error: { type: String },
}, { _id: false });
const campaignSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    steps: [campaignStepSchema],
    startDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'completed', 'paused', 'draft'],
        default: 'scheduled',
    },
    recipients: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead' }],
    recipientCount: { type: Number, default: 0 },
    lastProcessed: { type: Date },
}, {
    timestamps: true,
});
// Create indexes for efficient queries
campaignSchema.index({ userId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ startDate: 1 });
exports.default = (0, mongoose_1.model)('Campaign', campaignSchema);
