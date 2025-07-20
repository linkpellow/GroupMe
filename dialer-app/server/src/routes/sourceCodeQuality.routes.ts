import express, { Router } from 'express';
import { check } from 'express-validator';
import { auth } from '../middleware/auth';
import {
  getQualityAssignments,
  setQualityAssignment,
  removeQualityAssignment,
  getQualityCounts
} from '../controllers/sourceCodeQuality.controller';

const router: Router = express.Router();

// Validation middleware
const setQualityValidation = [
  check('sourceCode', 'Source code is required').not().isEmpty().trim(),
  check('quality', 'Quality must be either "quality" or "low-quality"')
    .isIn(['quality', 'low-quality'])
];

// All routes require authentication
router.use(auth);

// Routes
router.get('/', getQualityAssignments);
router.get('/counts', getQualityCounts);
router.post('/', setQualityValidation, setQualityAssignment);
router.delete('/:sourceCode', removeQualityAssignment);

export default router; 