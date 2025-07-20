"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQualityCounts = exports.removeQualityAssignment = exports.autoAssignQuality = exports.setQualityAssignment = exports.getQualityAssignments = void 0;
const SourceCodeQuality_1 = __importDefault(require("../models/SourceCodeQuality"));
// Get all quality assignments for the authenticated user
const getQualityAssignments = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const qualityAssignments = await SourceCodeQuality_1.default.find({ userId }).lean();
        // Transform to a map for easier frontend consumption
        const qualityMap = {};
        qualityAssignments.forEach(assignment => {
            qualityMap[assignment.sourceCode] = assignment.quality;
        });
        res.json({
            success: true,
            data: qualityMap,
            count: qualityAssignments.length
        });
    }
    catch (error) {
        console.error('Get quality assignments error:', error);
        res.status(500).json({ message: 'Error fetching quality assignments' });
    }
};
exports.getQualityAssignments = getQualityAssignments;
// Create or update a quality assignment
const setQualityAssignment = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { sourceCode, quality, autoAssigned = false } = req.body;
        // Validate input
        if (!sourceCode || !quality) {
            return res.status(400).json({ message: 'sourceCode and quality are required' });
        }
        if (!['quality', 'low-quality'].includes(quality)) {
            return res.status(400).json({ message: 'quality must be either "quality" or "low-quality"' });
        }
        // Upsert the quality assignment
        const qualityAssignment = await SourceCodeQuality_1.default.findOneAndUpdate({ userId, sourceCode: sourceCode.trim() }, { quality, autoAssigned }, {
            new: true,
            upsert: true,
            runValidators: true
        });
        res.json({
            success: true,
            data: qualityAssignment
        });
    }
    catch (error) {
        console.error('Set quality assignment error:', error);
        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Quality assignment already exists for this source code' });
        }
        res.status(500).json({ message: 'Error setting quality assignment' });
    }
};
exports.setQualityAssignment = setQualityAssignment;
// Auto-assign quality for SOLD leads (internal function)
const autoAssignQuality = async (userId, sourceCode, quality = 'quality') => {
    try {
        if (!sourceCode || !userId) {
            console.log('Auto-quality assignment skipped: missing sourceCode or userId');
            return false;
        }
        // Check if already assigned as low-quality (don't override manual low-quality assignments)
        const existing = await SourceCodeQuality_1.default.findOne({ userId, sourceCode: sourceCode.trim() });
        if (existing?.quality === 'low-quality' && !existing.autoAssigned) {
            console.log(`Skipping auto-assignment: ${sourceCode} already manually marked as low-quality`);
            return false;
        }
        // Upsert with auto-assignment flag
        const qualityAssignment = await SourceCodeQuality_1.default.findOneAndUpdate({ userId, sourceCode: sourceCode.trim() }, { quality, autoAssigned: true }, {
            new: true,
            upsert: true,
            runValidators: true
        });
        console.log(`Auto-assigned ${quality} to source code ${sourceCode} for user ${userId}`);
        return true;
    }
    catch (error) {
        console.error('Auto-quality assignment failed:', error);
        return false;
    }
};
exports.autoAssignQuality = autoAssignQuality;
// Remove a quality assignment
const removeQualityAssignment = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { sourceCode } = req.params;
        if (!sourceCode) {
            return res.status(400).json({ message: 'sourceCode is required' });
        }
        const result = await SourceCodeQuality_1.default.findOneAndDelete({
            userId,
            sourceCode: sourceCode.trim()
        });
        if (!result) {
            return res.status(404).json({ message: 'Quality assignment not found' });
        }
        res.json({
            success: true,
            message: 'Quality assignment removed successfully'
        });
    }
    catch (error) {
        console.error('Remove quality assignment error:', error);
        res.status(500).json({ message: 'Error removing quality assignment' });
    }
};
exports.removeQualityAssignment = removeQualityAssignment;
// Get quality counts for filtering UI
const getQualityCounts = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const counts = await SourceCodeQuality_1.default.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: '$quality',
                    count: { $sum: 1 }
                }
            }
        ]);
        const qualityCount = counts.find(c => c._id === 'quality')?.count || 0;
        const lowQualityCount = counts.find(c => c._id === 'low-quality')?.count || 0;
        res.json({
            success: true,
            data: {
                quality: qualityCount,
                'low-quality': lowQualityCount,
                total: qualityCount + lowQualityCount
            }
        });
    }
    catch (error) {
        console.error('Get quality counts error:', error);
        res.status(500).json({ message: 'Error fetching quality counts' });
    }
};
exports.getQualityCounts = getQualityCounts;
