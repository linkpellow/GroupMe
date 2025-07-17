"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePasscode = exports.deletePasscode = exports.deactivatePasscode = exports.getPasscodes = exports.createPasscode = exports.consumePasscode = exports.validatePasscode = void 0;
const Passcode_1 = __importDefault(require("../models/Passcode"));
/**
 * Validate a passcode for sign-up access
 * POST /api/auth/validate-passcode
 */
const validatePasscode = async (req, res, next) => {
    try {
        const { code } = req.body;
        // Validate input
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Passcode is required'
            });
        }
        // Normalize code to uppercase
        const normalizedCode = code.toUpperCase().trim();
        // Find passcode in database
        const passcode = await Passcode_1.default.findOne({
            code: normalizedCode,
            isActive: true
        });
        if (!passcode) {
            return res.status(400).json({
                success: false,
                message: 'Invalid passcode'
            });
        }
        // Check if passcode is valid (not expired)
        if (!passcode.isValid()) {
            return res.status(400).json({
                success: false,
                message: 'Passcode has expired'
            });
        }
        // Check if passcode can be used (not exceeded max uses)
        if (!passcode.canBeUsed()) {
            return res.status(400).json({
                success: false,
                message: 'Passcode has reached maximum usage limit'
            });
        }
        // Return success response
        res.json({
            success: true,
            message: 'Passcode is valid',
            data: {
                code: passcode.code,
                maxUses: passcode.maxUses,
                currentUses: passcode.currentUses,
                remainingUses: passcode.maxUses - passcode.currentUses,
                expiresAt: passcode.expiresAt,
                description: passcode.description
            }
        });
    }
    catch (error) {
        console.error('Passcode validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating passcode'
        });
        next(error);
    }
};
exports.validatePasscode = validatePasscode;
/**
 * Consume a passcode (increment usage count)
 * POST /api/auth/consume-passcode
 */
const consumePasscode = async (req, res, next) => {
    try {
        const { code } = req.body;
        // Validate input
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Passcode is required'
            });
        }
        // Normalize code to uppercase
        const normalizedCode = code.toUpperCase().trim();
        // Find and validate passcode
        const passcode = await Passcode_1.default.findOne({
            code: normalizedCode,
            isActive: true
        });
        if (!passcode) {
            return res.status(400).json({
                success: false,
                message: 'Invalid passcode'
            });
        }
        if (!passcode.canBeUsed()) {
            return res.status(400).json({
                success: false,
                message: 'Passcode cannot be used'
            });
        }
        // Increment usage count
        await passcode.incrementUsage();
        res.json({
            success: true,
            message: 'Passcode consumed successfully',
            data: {
                code: passcode.code,
                currentUses: passcode.currentUses,
                maxUses: passcode.maxUses
            }
        });
    }
    catch (error) {
        console.error('Passcode consumption error:', error);
        res.status(500).json({
            success: false,
            message: 'Error consuming passcode'
        });
        next(error);
    }
};
exports.consumePasscode = consumePasscode;
/**
 * Create a new passcode (admin only)
 * POST /api/auth/passcodes
 */
const createPasscode = async (req, res, next) => {
    try {
        const { code, maxUses, expiresAt, description } = req.body;
        // Validate input
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Passcode is required'
            });
        }
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Check if passcode already exists
        const existingPasscode = await Passcode_1.default.findOne({
            code: code.toUpperCase().trim()
        });
        if (existingPasscode) {
            return res.status(400).json({
                success: false,
                message: 'Passcode already exists'
            });
        }
        // Create new passcode
        const passcode = await Passcode_1.default.create({
            code: code.toUpperCase().trim(),
            maxUses: maxUses || 1,
            createdBy: req.user._id,
            expiresAt: expiresAt || null,
            description: description || null
        });
        res.status(201).json({
            success: true,
            message: 'Passcode created successfully',
            data: {
                code: passcode.code,
                maxUses: passcode.maxUses,
                expiresAt: passcode.expiresAt,
                description: passcode.description
            }
        });
    }
    catch (error) {
        console.error('Create passcode error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating passcode'
        });
        next(error);
    }
};
exports.createPasscode = createPasscode;
/**
 * Get all passcodes (admin only)
 * GET /api/auth/passcodes
 */
const getPasscodes = async (req, res, next) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const passcodes = await Passcode_1.default.find({})
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: passcodes.map(passcode => ({
                _id: passcode._id,
                code: passcode.code,
                isActive: passcode.isActive,
                maxUses: passcode.maxUses,
                currentUses: passcode.currentUses,
                remainingUses: passcode.maxUses - passcode.currentUses,
                createdBy: passcode.createdBy,
                createdAt: passcode.createdAt,
                expiresAt: passcode.expiresAt,
                description: passcode.description,
                isValid: passcode.isValid(),
                canBeUsed: passcode.canBeUsed()
            }))
        });
    }
    catch (error) {
        console.error('Get passcodes error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching passcodes'
        });
        next(error);
    }
};
exports.getPasscodes = getPasscodes;
/**
 * Deactivate a passcode (admin only)
 * PUT /api/auth/passcodes/:id/deactivate
 */
const deactivatePasscode = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const passcode = await Passcode_1.default.findById(id);
        if (!passcode) {
            return res.status(404).json({
                success: false,
                message: 'Passcode not found'
            });
        }
        passcode.isActive = false;
        await passcode.save();
        res.json({
            success: true,
            message: 'Passcode deactivated successfully',
            data: {
                code: passcode.code,
                isActive: passcode.isActive
            }
        });
    }
    catch (error) {
        console.error('Deactivate passcode error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deactivating passcode'
        });
        next(error);
    }
};
exports.deactivatePasscode = deactivatePasscode;
/**
 * Delete a passcode (admin only)
 * DELETE /api/auth/passcodes/:id
 */
const deletePasscode = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const passcode = await Passcode_1.default.findByIdAndDelete(id);
        if (!passcode) {
            return res.status(404).json({
                success: false,
                message: 'Passcode not found'
            });
        }
        res.json({
            success: true,
            message: 'Passcode deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete passcode error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting passcode'
        });
        next(error);
    }
};
exports.deletePasscode = deletePasscode;
/**
 * Generate a random passcode (admin only)
 * POST /api/auth/passcodes/generate
 */
const generatePasscode = async (req, res, next) => {
    try {
        const { maxUses = 1, expiresAt, description } = req.body;
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Generate a random 8-character passcode
        const generateRandomCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        // Generate unique code
        let code;
        let attempts = 0;
        const maxAttempts = 10;
        do {
            code = generateRandomCode();
            attempts++;
            if (attempts > maxAttempts) {
                return res.status(500).json({
                    success: false,
                    message: 'Unable to generate unique passcode'
                });
            }
        } while (await Passcode_1.default.findOne({ code }));
        // Create new passcode
        const passcode = await Passcode_1.default.create({
            code,
            maxUses,
            createdBy: req.user._id,
            expiresAt: expiresAt || null,
            description: description || null
        });
        res.status(201).json({
            success: true,
            message: 'Passcode generated successfully',
            data: {
                code: passcode.code,
                maxUses: passcode.maxUses,
                expiresAt: passcode.expiresAt,
                description: passcode.description
            }
        });
    }
    catch (error) {
        console.error('Generate passcode error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating passcode'
        });
        next(error);
    }
};
exports.generatePasscode = generatePasscode;
