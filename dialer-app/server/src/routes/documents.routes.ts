import { Router } from 'express';
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  downloadDocument,
  checkDocumentDeleted,
  upload,
} from '../controllers/documents.controller';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Upload a document
router.post('/upload', upload.single('file'), uploadDocument);

// List documents for a client
router.get('/client/:clientId', listDocuments);

// Delete a document (soft delete)
router.delete('/:documentId', deleteDocument);

// Download a document
router.get('/download/:filename', downloadDocument);

// Check if document is deleted
router.get('/isDeleted/:documentId', checkDocumentDeleted);

export default router;
