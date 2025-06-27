import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import DocumentModel from '../models/document.model';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'documents');

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
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
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'));
  }
};

// Multer instance with limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload document
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { clientId } = req.body;

    if (!clientId) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Validate client ID
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    // Create document record
    const document = new DocumentModel({
      clientId: new mongoose.Types.ObjectId(clientId),
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      filePath: req.file.path,
      fileUrl: `/api/documents/download/${req.file.filename}`,
      uploadDate: new Date(),
      metadata: {
        uploadedBy: (req as any).user?._id || 'system',
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
  } catch (error) {
    console.error('Error uploading document:', error);

    // Clean up file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ error: 'Failed to upload document' });
  }
};

// List documents for a client
export const listDocuments = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const documents = await DocumentModel.find({
      clientId: new mongoose.Types.ObjectId(clientId),
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
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
};

// Delete document (soft delete)
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await DocumentModel.findById(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.isDeleted) {
      return res.status(404).json({ error: 'Document already deleted' });
    }

    // Soft delete
    await document.softDelete();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

// Download document
export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Find document by filename
    const document = await DocumentModel.findOne({
      fileName: filename,
      isDeleted: false,
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.setHeader('Content-Length', document.fileSize.toString());

    // Stream the file
    const fileStream = require('fs').createReadStream(document.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
};

// Check if document is deleted
export const checkDocumentDeleted = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await DocumentModel.findById(documentId);

    if (!document) {
      return res.json({ isDeleted: true });
    }

    res.json({ isDeleted: document.isDeleted });
  } catch (error) {
    console.error('Error checking document:', error);
    res.status(500).json({ error: 'Failed to check document status' });
  }
};
