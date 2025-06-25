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
const documentSchema = new mongoose_1.Schema({
    clientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true,
    },
    fileName: {
        type: String,
        required: true,
        trim: true,
    },
    originalName: {
        type: String,
        required: true,
        trim: true,
    },
    fileSize: {
        type: Number,
        required: true,
        min: 0,
    },
    fileType: {
        type: String,
        required: true,
        default: 'application/pdf',
    },
    fileUrl: {
        type: String,
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    uploadDate: {
        type: Date,
        default: Date.now,
        index: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    metadata: {
        lastModified: Date,
        uploadedBy: String,
        description: String,
    },
}, {
    timestamps: true,
    collection: 'documents',
});
// Indexes for performance
documentSchema.index({ clientId: 1, isDeleted: 1 });
documentSchema.index({ uploadDate: -1 });
documentSchema.index({ fileName: 1 });
// Virtual for returning formatted document data
documentSchema.virtual('formattedDocument').get(function () {
    return {
        _id: this._id,
        clientId: this.clientId,
        fileName: this.originalName,
        fileSize: this.fileSize,
        fileType: this.fileType,
        uploadDate: this.uploadDate.toISOString(),
        fileUrl: this.fileUrl,
    };
});
// Method to soft delete
documentSchema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};
// Method to restore
documentSchema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = undefined;
    return this.save();
};
const DocumentModel = mongoose_1.default.model('Document', documentSchema);
exports.default = DocumentModel;
