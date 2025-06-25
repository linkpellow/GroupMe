"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.verifyToken = exports.getProfile = exports.login = exports.register = exports.generateToken = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const jwt_config_1 = require("../config/jwt.config");
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ _id: userId }, jwt_config_1.JWT_SECRET, {
        expiresIn: jwt_config_1.JWT_EXPIRATION,
    });
};
exports.generateToken = generateToken;
const register = async (req, res, next) => {
    try {
        const { email, password, name } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Create user with username defaulting to email
        const user = await User_1.default.create({
            email,
            password: hashedPassword,
            name,
            username: email, // Set username to email by default
            role: 'user', // Ensure new users get the user role
        });
        // Generate token
        const token = (0, exports.generateToken)(user._id.toString());
        console.log('Generated token for new user:', {
            userId: user._id,
            email: user.email,
        });
        res.status(201).json({
            token,
            user: {
                _id: user._id,
                id: user._id, // Add id for client compatibility
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        console.log('Login attempt received for email:', req.body.email);
        console.log('Request body:', req.body);
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        // Find user by email
        const user = await User_1.default.findOne({ email }).exec();
        // Log user found/not found (but don't expose if user exists to client)
        if (user) {
            console.log('User found:', {
                id: user._id,
                email: user.email,
                role: user.role,
            });
        }
        else {
            console.log('No user found with email:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Check password (comparePassword method defined in User model)
        let isMatch;
        try {
            isMatch = await user.comparePassword(password);
            console.log('Password comparison result:', isMatch);
        }
        catch (pwError) {
            console.error('Error comparing password:', pwError);
            isMatch = false;
        }
        if (!isMatch) {
            console.log('Password does not match for user:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Generate token
        const token = (0, exports.generateToken)(user._id.toString());
        console.log('Login successful, token generated for user:', email);
        // Make sure we're consistent with the user object structure
        const userResponse = {
            _id: user._id.toString(),
            id: user._id.toString(), // Add id for client compatibility
            name: user.name,
            email: user.email,
            role: user.role,
        };
        res.json({
            token,
            user: userResponse,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Error logging in',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development'
                ? error instanceof Error
                    ? error.stack
                    : ''
                : undefined,
        });
        next(error);
    }
};
exports.login = login;
const getProfile = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Return the user data with profile picture explicitly included
        const userResponse = {
            _id: user._id.toString(),
            id: user._id.toString(), // Add id for client compatibility
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            role: user.role,
        };
        res.json(userResponse);
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Error getting profile' });
        next(error);
    }
};
exports.getProfile = getProfile;
const verifyToken = async (req, res, next) => {
    try {
        // Get the user from the database to ensure they still exist
        const user = await User_1.default.findById(req.user?._id).select('-password');
        if (!user) {
            return res.status(401).json({ valid: false, message: 'User not found' });
        }
        // Return the user data along with the valid flag
        res.json({
            valid: true,
            user: {
                _id: user._id.toString(),
                id: user._id.toString(), // Add id for client compatibility
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Error in verifyToken:', error);
        res.status(500).json({ valid: false, message: 'Server error' });
        next(error);
    }
};
exports.verifyToken = verifyToken;
const updateProfile = async (req, res, next) => {
    try {
        // Make sure user is authenticated
        if (!req.user?._id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const userId = req.user._id;
        const { name, email, password, profilePicture } = req.body;
        // Get current user
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Update fields if provided
        if (name) {
            user.name = name;
        }
        if (email && email !== user.email) {
            // Check if email is already in use
            const existingUser = await User_1.default.findOne({
                email,
                _id: { $ne: userId },
            });
            if (existingUser) {
                return res.status(400).json({ message: 'Email is already in use' });
            }
            user.email = email;
            user.username = email; // Keep username and email in sync
        }
        if (profilePicture) {
            user.profilePicture = profilePicture;
        }
        // If password is being updated, hash it
        if (password) {
            const salt = await bcryptjs_1.default.genSalt(10);
            user.password = await bcryptjs_1.default.hash(password, salt);
        }
        // Save updated user
        await user.save();
        // Return user without password
        const userResponse = {
            _id: user._id.toString(),
            id: user._id.toString(), // Add id for client compatibility
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            role: user.role,
        };
        res.json(userResponse);
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
        next(error);
    }
};
exports.updateProfile = updateProfile;
