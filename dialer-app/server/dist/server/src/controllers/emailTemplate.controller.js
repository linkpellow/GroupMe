"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTemplate = exports.updateTemplate = exports.getTemplateById = exports.getTemplates = exports.createTemplate = void 0;
const EmailTemplate_1 = __importDefault(require("../models/EmailTemplate"));
/**
 * Create a new email template
 */
const createTemplate = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { name, subject, body, description } = req.body;
        // Validate required fields
        if (!name || !subject || !body) {
            return res.status(400).json({ message: 'Name, subject, and body are required' });
        }
        // Create new template
        const template = new EmailTemplate_1.default({
            userId: req.user.id,
            name,
            subject,
            body,
            description,
        });
        await template.save();
        res.status(201).json(template);
    }
    catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ message: 'Failed to create template' });
    }
};
exports.createTemplate = createTemplate;
/**
 * Get all templates for the current user
 */
const getTemplates = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const templates = await EmailTemplate_1.default.find({ userId: req.user.id }).sort({
            createdAt: -1,
        });
        res.json(templates);
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ message: 'Failed to fetch templates' });
    }
};
exports.getTemplates = getTemplates;
/**
 * Get a specific template by ID
 */
const getTemplateById = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const template = await EmailTemplate_1.default.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json(template);
    }
    catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ message: 'Failed to fetch template' });
    }
};
exports.getTemplateById = getTemplateById;
/**
 * Update a template
 */
const updateTemplate = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { name, subject, body, description } = req.body;
        // Validate required fields
        if (!name || !subject || !body) {
            return res.status(400).json({ message: 'Name, subject, and body are required' });
        }
        // Find and update the template
        const template = await EmailTemplate_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, {
            name,
            subject,
            body,
            description,
        }, { new: true });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json(template);
    }
    catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ message: 'Failed to update template' });
    }
};
exports.updateTemplate = updateTemplate;
/**
 * Delete a template
 */
const deleteTemplate = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const result = await EmailTemplate_1.default.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id,
        });
        if (!result) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ message: 'Failed to delete template' });
    }
};
exports.deleteTemplate = deleteTemplate;
