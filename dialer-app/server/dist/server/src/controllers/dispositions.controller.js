"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultDispositionsOnStartup = exports.seedDefaultDispositions = exports.getDisposition = exports.deleteDisposition = exports.updateDisposition = exports.createDisposition = exports.getUserDispositions = exports.getAllDispositions = void 0;
const Disposition_1 = __importDefault(require("../models/Disposition"));
// Get all dispositions
const getAllDispositions = async (req, res) => {
    try {
        const dispositions = await Disposition_1.default.find({}).sort({
            isDefault: -1,
            sortOrder: 1,
            name: 1,
        });
        res.json({ dispositions });
    }
    catch (error) {
        console.error('Error getting dispositions:', error);
        res.status(500).json({
            message: 'Error fetching dispositions',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getAllDispositions = getAllDispositions;
// Get dispositions for current user
const getUserDispositions = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        // Get both default dispositions and user-created ones
        const dispositions = await Disposition_1.default.find({
            $or: [{ isDefault: true }, { createdBy: req.user._id }],
        }).sort({ isDefault: -1, sortOrder: 1, name: 1 });
        res.json({ dispositions });
    }
    catch (error) {
        console.error('Error getting user dispositions:', error);
        res.status(500).json({
            message: 'Error fetching user dispositions',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getUserDispositions = getUserDispositions;
// Create a new disposition
const createDisposition = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { name, color, emoji } = req.body;
        if (!name || !color) {
            return res.status(400).json({ message: 'Name and color are required' });
        }
        // Check if disposition with this name already exists
        const existingDisposition = await Disposition_1.default.findOne({ name });
        if (existingDisposition) {
            return res.status(400).json({ message: 'A disposition with this name already exists' });
        }
        // Get the highest sortOrder to place this one at the end
        const highestSorted = await Disposition_1.default.findOne({}).sort({
            sortOrder: -1,
        });
        const nextSortOrder = highestSorted ? highestSorted.sortOrder + 1 : 0;
        const newDisposition = await Disposition_1.default.create({
            name,
            color,
            emoji: emoji || '',
            isDefault: false,
            createdBy: req.user._id,
            sortOrder: nextSortOrder,
        });
        res.status(201).json(newDisposition);
    }
    catch (error) {
        console.error('Error creating disposition:', error);
        res.status(500).json({
            message: 'Error creating disposition',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.createDisposition = createDisposition;
// Update a disposition
const updateDisposition = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { id } = req.params;
        const { name, color, emoji, sortOrder } = req.body;
        // Find the disposition
        const disposition = await Disposition_1.default.findById(id);
        if (!disposition) {
            return res.status(404).json({ message: 'Disposition not found' });
        }
        // Check ownership for non-admin users - only allow updating if it's the user's own
        if (req.user.role !== 'admin' && disposition.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this disposition' });
        }
        // Update the disposition
        const updates = {};
        if (name) {
            updates.name = name;
        }
        if (color) {
            updates.color = color;
        }
        if (emoji !== undefined) {
            updates.emoji = emoji;
        }
        if (sortOrder !== undefined) {
            updates.sortOrder = sortOrder;
        }
        const updatedDisposition = await Disposition_1.default.findByIdAndUpdate(id, { $set: updates }, { new: true });
        res.json(updatedDisposition);
    }
    catch (error) {
        console.error('Error updating disposition:', error);
        res.status(500).json({
            message: 'Error updating disposition',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.updateDisposition = updateDisposition;
// Delete a disposition
const deleteDisposition = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { id } = req.params;
        // Find the disposition
        const disposition = await Disposition_1.default.findById(id);
        if (!disposition) {
            return res.status(404).json({ message: 'Disposition not found' });
        }
        // Check ownership for non-admin users - only allow deleting if it's the user's own
        if (req.user.role !== 'admin' && disposition.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this disposition' });
        }
        await Disposition_1.default.findByIdAndDelete(id);
        res.json({ message: 'Disposition deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting disposition:', error);
        res.status(500).json({
            message: 'Error deleting disposition',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.deleteDisposition = deleteDisposition;
// Get a single disposition
const getDisposition = async (req, res) => {
    try {
        const { id } = req.params;
        const disposition = await Disposition_1.default.findById(id);
        if (!disposition) {
            return res.status(404).json({ message: 'Disposition not found' });
        }
        res.json(disposition);
    }
    catch (error) {
        console.error('Error getting disposition:', error);
        res.status(500).json({
            message: 'Error fetching disposition',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getDisposition = getDisposition;
// Seed default dispositions
const seedDefaultDispositions = async (req, res) => {
    try {
        // Default dispositions data
        const defaultDispositions = [
            { name: 'Positive Contact', color: '#38A169', sortOrder: 0 },
            { name: 'Negative Contact', color: '#E53E3E', sortOrder: 1 },
            { name: 'Employer Coverage', color: '#2196F3', sortOrder: 2 },
            { name: 'Brokie', color: '#FF9800', sortOrder: 3 },
            { name: 'Buy Or Die', color: '#9C27B0', sortOrder: 4 },
            { name: 'Unhealthy/Referred', color: '#795548', sortOrder: 5 },
            { name: 'Foreign', color: '#607D8B', sortOrder: 6 },
            { name: 'Quoted', color: '#00BCD4', sortOrder: 7 },
            { name: 'SOLD', color: '#84CC16', sortOrder: 8 },
            { name: 'Appointment', color: '#FFC107', sortOrder: 9 },
            { name: 'No Contact', color: '#805AD5', sortOrder: 10 },
            { name: 'Invalid/Disconnected', color: '#E91E63', sortOrder: 11 },
            { name: 'Hung Up', color: '#9E9E9E', sortOrder: 12 },
            { name: 'Ghosted', color: '#E6F0F5', sortOrder: 13, emoji: '👻' },
        ];
        // Get existing dispositions to avoid duplicates
        const existingDispositions = await Disposition_1.default.find({});
        const existingNames = existingDispositions.map((d) => d.name);
        // Filter out dispositions that already exist
        const dispositionsToCreate = defaultDispositions.filter((disp) => !existingNames.includes(disp.name));
        if (dispositionsToCreate.length === 0) {
            // If all default dispositions already exist, just return them
            return res.json({
                message: 'Default dispositions already exist',
                dispositions: existingDispositions,
            });
        }
        // Create the missing default dispositions
        const newDispositions = await Promise.all(dispositionsToCreate.map((disp) => Disposition_1.default.create({
            ...disp,
            isDefault: true,
            createdBy: req.user?._id,
        })));
        // Get all dispositions after adding the new ones
        const allDispositions = await Disposition_1.default.find({}).sort({
            isDefault: -1,
            sortOrder: 1,
            name: 1,
        });
        res.status(201).json({
            message: 'Default dispositions created successfully',
            dispositions: allDispositions,
        });
    }
    catch (error) {
        console.error('Error seeding default dispositions:', error);
        res.status(500).json({
            message: 'Error seeding default dispositions',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.seedDefaultDispositions = seedDefaultDispositions;
// Function to seed default dispositions without requiring a request
// This can be called directly from server startup
const seedDefaultDispositionsOnStartup = async (userId) => {
    try {
        console.log('Checking if default dispositions need to be seeded...');
        // Default dispositions data
        const defaultDispositions = [
            { name: 'Positive Contact', color: '#38A169', sortOrder: 0 },
            { name: 'Negative Contact', color: '#E53E3E', sortOrder: 1 },
            { name: 'Employer Coverage', color: '#2196F3', sortOrder: 2 },
            { name: 'Brokie', color: '#FF9800', sortOrder: 3 },
            { name: 'Buy Or Die', color: '#9C27B0', sortOrder: 4 },
            { name: 'Unhealthy/Referred', color: '#795548', sortOrder: 5 },
            { name: 'Foreign', color: '#607D8B', sortOrder: 6 },
            { name: 'Quoted', color: '#00BCD4', sortOrder: 7 },
            { name: 'SOLD', color: '#84CC16', sortOrder: 8 },
            { name: 'Appointment', color: '#FFC107', sortOrder: 9 },
            { name: 'No Contact', color: '#805AD5', sortOrder: 10 },
            { name: 'Invalid/Disconnected', color: '#E91E63', sortOrder: 11 },
            { name: 'Hung Up', color: '#9E9E9E', sortOrder: 12 },
            { name: 'Ghosted', color: '#E6F0F5', sortOrder: 13, emoji: '👻' },
        ];
        // Check if we have any dispositions
        const count = await Disposition_1.default.countDocuments();
        if (count === 0) {
            console.log('No dispositions found, seeding defaults...');
            // Create all default dispositions
            await Promise.all(defaultDispositions.map((disp) => Disposition_1.default.create({
                ...disp,
                isDefault: true,
                createdBy: userId,
            })));
            console.log('Default dispositions seeded successfully');
            return true;
        }
        else {
            console.log(`Found ${count} existing dispositions, no need to seed defaults`);
            return false;
        }
    }
    catch (error) {
        console.error('Error seeding default dispositions on startup:', error);
        return false;
    }
};
exports.seedDefaultDispositionsOnStartup = seedDefaultDispositionsOnStartup;
