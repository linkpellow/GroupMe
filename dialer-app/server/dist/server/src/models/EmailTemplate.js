"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const emailTemplateSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    description: { type: String },
}, {
    timestamps: true,
});
// Create index for quicker lookups
emailTemplateSchema.index({ userId: 1 });
exports.default = (0, mongoose_1.model)('EmailTemplate', emailTemplateSchema);
