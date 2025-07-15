"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documents_controller_1 = require("../controllers/documents.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Upload a document
router.post('/upload', documents_controller_1.upload.single('file'), documents_controller_1.uploadDocument);
// List documents for a client
router.get('/client/:clientId', documents_controller_1.listDocuments);
// Delete a document (soft delete)
router.delete('/:documentId', documents_controller_1.deleteDocument);
// Download a document
router.get('/download/:filename', documents_controller_1.downloadDocument);
// Check if document is deleted
router.get('/isDeleted/:documentId', documents_controller_1.checkDocumentDeleted);
exports.default = router;
