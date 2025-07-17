"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDocumentDeleted = exports.downloadDocument = exports.deleteDocument = exports.listDocuments = exports.uploadDocument = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const document_model_1 = __importDefault(require("../models/document.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
// Configure multer for file uploads
const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'documents');
// Ensure upload directory exists
const ensureUploadDir = async () => {
    try {
        await promises_1.default.access(uploadDir);
    }
    catch {
        await promises_1.default.mkdir(uploadDir, { recursive: true });
    }
};
// Multer configuration
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        await ensureUploadDir();
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = `${Date.now()}-${crypto_1.default.randomBytes(6).toString('hex')}`;
        const ext = path_1.default.extname(file.originalname);
        const baseName = path_1.default.basename(file.originalname, ext);
        const fileName = `${baseName}-${uniqueSuffix}${ext}`;
        cb(null, fileName);
    },
});
// Allowed MIME types for uploads (documents, images, archives, email files)
const allowedMimeTypes = new Set([
    // Documents
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain', // .txt
    'application/rtf', // .rtf
    'text/csv', // .csv
    // Images
    'image/jpeg', // .jpeg, .jpg, .jfif
    'image/pjpeg',
    'image/bmp', // .bmp
    'image/tiff', // .tiff
    'image/heic', // .heic (some browsers may report image/heif)
    'image/heif',
    // Archives
    'application/zip', // .zip
    'application/x-rar-compressed', // .rar
    'application/x-7z-compressed', // .7z
    // Email
    'message/rfc822', // .eml
    'application/vnd.ms-outlook', // .msg – may come as this mimetype
]);
// Multer file filter – allow only whitelisted mime types
const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Unsupported file type'));
    }
};
// Multer instance with limits
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
// Upload document
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const { clientId } = req.body;
        if (!clientId) {
            // Clean up uploaded file
            await promises_1.default.unlink(req.file.path);
            return res.status(400).json({ error: 'Client ID is required' });
        }
        // Validate client ID
        if (!mongoose_1.default.Types.ObjectId.isValid(clientId)) {
            await promises_1.default.unlink(req.file.path);
            return res.status(400).json({ error: 'Invalid client ID' });
        }
        // Create document record
        const document = new document_model_1.default({
            clientId: new mongoose_1.default.Types.ObjectId(clientId),
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            filePath: req.file.path,
            fileUrl: `/api/documents/download/${req.file.filename}`,
            uploadDate: new Date(),
            metadata: {
                uploadedBy: req.user?._id || 'system',
            },
        });
        await document.save();
        // Return formatted document
        res.status(201).json({
            _id: document._id,
            clientId: document.clientId,
            fileName: document.originalName,
            fileSize: document.fileSize,
            fileType: document.fileType,
            uploadDate: document.uploadDate.toISOString(),
            fileUrl: document.fileUrl,
        });
    }
    catch (error) {
        console.error('Error uploading document:', error);
        // Clean up file on error
        if (req.file) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Failed to upload document' });
    }
};
exports.uploadDocument = uploadDocument;
// List documents for a client
const listDocuments = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({ error: 'Invalid client ID' });
        }
        const documents = await document_model_1.default.find({
            clientId: new mongoose_1.default.Types.ObjectId(clientId),
            isDeleted: false,
        }).sort({ uploadDate: -1 });
        const formattedDocuments = documents.map((doc) => ({
            _id: doc._id,
            clientId: doc.clientId,
            fileName: doc.originalName,
            fileSize: doc.fileSize,
            fileType: doc.fileType,
            uploadDate: doc.uploadDate.toISOString(),
            fileUrl: doc.fileUrl,
        }));
        res.json({ documents: formattedDocuments });
    }
    catch (error) {
        console.error('Error listing documents:', error);
        res.status(500).json({ error: 'Failed to list documents' });
    }
};
exports.listDocuments = listDocuments;
// Delete document (soft delete)
const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ error: 'Invalid document ID' });
        }
        const document = await document_model_1.default.findById(documentId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        if (document.isDeleted) {
            return res.status(404).json({ error: 'Document already deleted' });
        }
        // Soft delete
        await document.softDelete();
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
exports.deleteDocument = deleteDocument;
// Download document
const downloadDocument = async (req, res) => {
    try {
        const { filename } = req.params;
        // Find document by filename
        const document = await document_model_1.default.findOne({
            fileName: filename,
            isDeleted: false,
        });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // Check if file exists
        try {
            await promises_1.default.access(document.filePath);
        }
        catch {
            return res.status(404).json({ error: 'File not found on server' });
        }
        // Set appropriate headers
        res.setHeader('Content-Type', document.fileType);
        res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
        res.setHeader('Content-Length', document.fileSize.toString());
        // Stream the file
        const fileStream = require('fs').createReadStream(document.filePath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
};
exports.downloadDocument = downloadDocument;
// Check if document is deleted
const checkDocumentDeleted = async (req, res) => {
    try {
        const { documentId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ error: 'Invalid document ID' });
        }
        const document = await document_model_1.default.findById(documentId);
        if (!document) {
            return res.json({ isDeleted: true });
        }
        res.json({ isDeleted: document.isDeleted });
    }
    catch (error) {
        console.error('Error checking document:', error);
        res.status(500).json({ error: 'Failed to check document status' });
    }
};
exports.checkDocumentDeleted = checkDocumentDeleted;
