"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const messageSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    phoneNumber: { type: String, required: true },
    message: { type: String, required: true },
    templateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Template' },
    scheduledTime: { type: Date },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
    },
    twilioMessageId: { type: String },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)('Message', messageSchema);
