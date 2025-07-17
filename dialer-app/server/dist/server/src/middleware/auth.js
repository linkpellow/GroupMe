"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.isAdmin = exports.isAgentOrAdmin = exports.authenticate = void 0;
const User_1 = __importDefault(require("../models/User"));
const jwt_config_1 = require("../config/jwt.config");
const authenticate = async (req, res, next) => {
    try {
        // First check Authorization header
        let token = req.header('Authorization');
        // If no Authorization header, check for token in cookies
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        // Handle various token formats
        if (token) {
            // Remove 'Bearer ' prefix if present
            if (token.startsWith('Bearer ')) {
                token = token.slice(7);
            }
            try {
                const decoded = (0, jwt_config_1.verifyToken)(token);
                // Handle both _id and id in the token payload
                const userId = decoded._id || decoded.id;
                if (!userId) {
                    return res.status(401).json({ error: 'Invalid token format' });
                }
                if (process.env.NODE_ENV === 'development')
                    console.debug('[AUTH] Lookup user %s', userId);
                const user = await User_1.default.findById(userId);
                if (!user) {
                    return res.status(401).json({ error: 'User not found' });
                }
                // Add both id and _id to req.user
                const userObj = user.toObject();
                userObj.id = userObj._id;
                req.user = userObj;
                if (process.env.NODE_ENV === 'development')
                    console.debug('[AUTH] Auth success %s', userObj.email || userObj._id);
                next();
            }
            catch (jwtError) {
                return res.status(401).json({
                    error: 'Invalid token',
                    details: jwtError instanceof Error ? jwtError.message : 'Unknown error',
                });
            }
        }
        else {
            // No token found
            return res.status(401).json({ error: 'No auth token found' });
        }
    }
    catch (error) {
        return res.status(401).json({
            error: 'Please authenticate',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.authenticate = authenticate;
exports.auth = exports.authenticate;
const isAgentOrAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('User not authenticated');
        }
        if (req.user.role !== 'admin' && req.user.role !== 'agent') {
            throw new Error('Not authorized');
        }
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Not authorized' });
    }
};
exports.isAgentOrAdmin = isAgentOrAdmin;
const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('User not authenticated');
        }
        if (req.user.role !== 'admin') {
            throw new Error('Admin access required');
        }
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Admin access required' });
    }
};
exports.isAdmin = isAdmin;
exports.default = exports.authenticate;
