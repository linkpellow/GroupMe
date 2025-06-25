import express from 'express';
import { check } from 'express-validator';
import { initiateCall, handleCallStatus, getCallHistory } from '../controllers/calls.controller';
import { auth } from '../middleware/auth';

const router = express.Router();

// Validation middleware
const callValidation = [
  check('leadId', 'Lead ID is required').not().isEmpty(),
  check('phone', 'Phone number is required').not().isEmpty(),
];

// Routes
router.post('/initiate', [auth, ...callValidation], initiateCall);
router.post('/status', handleCallStatus);
router.get('/history', auth, getCallHistory);

export default router;
