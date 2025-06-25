"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
// Validation middleware
const registerValidation = [
    (0, express_validator_1.check)('email', 'Please include a valid email').isEmail(),
    (0, express_validator_1.check)('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    (0, express_validator_1.check)('name', 'Name is required').not().isEmpty(),
];
const loginValidation = [
    (0, express_validator_1.check)('email', 'Please include a valid email').isEmail(),
    (0, express_validator_1.check)('password', 'Password is required').exists(),
];
// Update profile validation
const updateProfileValidation = [
    (0, express_validator_1.check)('email', 'Please include a valid email').optional().isEmail(),
    (0, express_validator_1.check)('password', 'Password must be at least 6 characters').optional().isLength({ min: 6 }),
    (0, express_validator_1.check)('name', 'Name is required').optional().not().isEmpty(),
];
// Routes
router.post('/register', registerValidation, (req, res, next) => {
    (0, auth_controller_1.register)(req, res, next).catch(next);
});
router.post('/login', loginValidation, (req, res, next) => {
    (0, auth_controller_1.login)(req, res, next).catch(next);
});
router.get('/profile', auth_1.auth, (req, res, next) => {
    (0, auth_controller_1.getProfile)(req, res, next).catch(next);
});
router.get('/verify', auth_1.auth, (req, res, next) => {
    (0, auth_controller_1.verifyToken)(req, res, next).catch(next);
});
router.put('/profile', auth_1.auth, updateProfileValidation, (req, res, next) => {
    (0, auth_controller_1.updateProfile)(req, res, next).catch(next);
});
// Add a debug endpoint to test profile picture updates
router.get('/debug-profile', auth_1.auth, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?._id).select('-password');
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
    }
    catch (error) {
        console.error('Debug profile error:', error);
        res.status(500).json({ message: 'Error getting debug profile info' });
    }
});
exports.default = router;
