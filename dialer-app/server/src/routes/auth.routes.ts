import express, { Request, Response, NextFunction } from 'express';
import { check } from 'express-validator';
import {
  register,
  login,
  getProfile,
  verifyToken,
  updateProfile,
} from '../controllers/auth.controller';
import { auth } from '../middleware/auth';
import UserModel from '../models/User';

const router = express.Router();

// Validation middleware
const registerValidation = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('name', 'Name is required').not().isEmpty(),
];

const loginValidation = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
];

// Update profile validation
const updateProfileValidation = [
  check('email', 'Please include a valid email').optional().isEmail(),
  check('password', 'Password must be at least 6 characters').optional().isLength({ min: 6 }),
  check('name', 'Name is required').optional().not().isEmpty(),
];

// Routes
router.post(
  '/register',
  registerValidation,
  (req: Request, res: Response, next: NextFunction): void => {
    register(req, res, next).catch(next);
  }
);

router.post('/login', loginValidation, (req: Request, res: Response, next: NextFunction): void => {
  login(req, res, next).catch(next);
});

router.get('/profile', auth, (req: Request, res: Response, next: NextFunction): void => {
  getProfile(req, res, next).catch(next);
});

router.get('/verify', auth, (req: Request, res: Response, next: NextFunction): void => {
  verifyToken(req, res, next).catch(next);
});

router.put(
  '/profile',
  auth,
  updateProfileValidation,
  (req: Request, res: Response, next: NextFunction): void => {
    updateProfile(req, res, next).catch(next);
  }
);

// Add a debug endpoint to test profile picture updates
router.get('/debug-profile', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserModel.findById(req.user?._id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Return detailed profile picture info for debugging
    res.json({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      hasProfilePicture: !!user.profilePicture,
      profilePictureLength: user.profilePicture ? user.profilePicture.length : 0,
      profilePictureType: user.profilePicture
        ? user.profilePicture.substring(0, 40) + '...'
        : 'none',
    });
  } catch (error) {
    console.error('Debug profile error:', error);
    res.status(500).json({ message: 'Error getting debug profile info' });
  }
});

export default router;
