import { Router } from 'express';
import { auth } from '../middleware/auth';
import { incrementDialCount, getDialCounts } from '../controllers/dialCount.controller';

const router = Router();

// Protected routes
router.post('/increment', auth, incrementDialCount);
router.get('/', auth, getDialCounts);

export default router;
