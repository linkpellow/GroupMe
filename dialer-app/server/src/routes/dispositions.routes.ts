import { Router } from 'express';
import { auth, isAdmin, isAgentOrAdmin } from '../middleware/auth';
import {
  getAllDispositions,
  getUserDispositions,
  getDisposition,
  createDisposition,
  updateDisposition,
  deleteDisposition,
  seedDefaultDispositions,
} from '../controllers/dispositions.controller';

const router = Router();

// Public routes
// none

// Protected routes (require authentication)
router.get('/', auth, getUserDispositions);
router.get('/all', auth, isAdmin, getAllDispositions);
router.get('/:id', auth, getDisposition);
router.post('/', auth, createDisposition);
router.put('/:id', auth, updateDisposition);
router.delete('/:id', auth, deleteDisposition);
router.post('/seed-defaults', auth, isAdmin, seedDefaultDispositions);

export default router;
