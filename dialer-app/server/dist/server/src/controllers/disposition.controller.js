"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Disposition_1 = __importDefault(require("../models/Disposition"));
const CrudController_1 = require("./base/CrudController");
/**
 * Disposition Controller
 * Extends CrudController for standard CRUD operations
 */
class DispositionController extends CrudController_1.CrudController {
    constructor() {
        super(Disposition_1.default, 'Disposition', {
            searchFields: ['name'],
            defaultSort: 'sortOrder',
            allowedQueryFields: ['isDefault', 'createdBy'],
            populateFields: 'createdBy',
        });
        /**
         * Custom endpoint to reorder dispositions
         */
        this.reorderDispositions = async (req, res) => {
            try {
                const { dispositions } = req.body;
                if (!Array.isArray(dispositions)) {
                    res.status(400).json({ error: 'Invalid dispositions array' });
                    return;
                }
                // Update sort order for each disposition
                const updates = dispositions.map((item, index) => Disposition_1.default.findOneAndUpdate({
                    _id: item.id,
                    createdBy: req.user?.id, // Ensure user owns the disposition
                }, { sortOrder: index }));
                await Promise.all(updates);
                // Fetch updated list
                const updatedDispositions = await Disposition_1.default.find({ createdBy: req.user?.id }).sort('sortOrder');
                res.json({
                    success: true,
                    data: updatedDispositions,
                    message: 'Dispositions reordered successfully',
                });
            }
            catch (error) {
                console.error('Error reordering dispositions:', error);
                res.status(500).json({ error: 'Failed to reorder dispositions' });
            }
        };
        /**
         * Get default disposition for user
         */
        this.getDefault = async (req, res) => {
            try {
                const defaultDisposition = await Disposition_1.default.findOne({
                    createdBy: req.user?.id,
                    isDefault: true,
                });
                if (!defaultDisposition) {
                    res.status(404).json({ error: 'No default disposition found' });
                    return;
                }
                res.json({
                    success: true,
                    data: defaultDisposition,
                });
            }
            catch (error) {
                console.error('Error getting default disposition:', error);
                res.status(500).json({ error: 'Failed to get default disposition' });
            }
        };
    }
    /**
     * Build base query to filter by user
     */
    buildBaseQuery(req) {
        const query = {};
        // Filter by user unless admin viewing all
        if (req.user?.role !== 'admin' || req.query.myDispositions === 'true') {
            query.createdBy = req.user?.id;
        }
        return query;
    }
    /**
     * Prepare data for creating a new disposition
     */
    async prepareCreateData(req) {
        const { name, color, isDefault, sortOrder, emoji } = req.body;
        // Get the highest sort order if not provided
        let order = sortOrder;
        if (order === undefined) {
            const lastDisposition = await Disposition_1.default.findOne().sort('-sortOrder');
            order = lastDisposition ? lastDisposition.sortOrder + 1 : 0;
        }
        // If this is set as default, unset other defaults
        if (isDefault) {
            await Disposition_1.default.updateMany({ createdBy: req.user?.id }, { isDefault: false });
        }
        return {
            name,
            color: color || '#FFFFFF',
            isDefault: isDefault || false,
            sortOrder: order,
            emoji: emoji || '',
            createdBy: req.user?.id,
        };
    }
    /**
     * Prepare data for updating a disposition
     */
    async prepareUpdateData(req, existing) {
        const { name, color, isDefault, sortOrder, emoji } = req.body;
        const updateData = {};
        // Only update fields that were provided
        if (name !== undefined)
            updateData.name = name;
        if (color !== undefined)
            updateData.color = color;
        if (sortOrder !== undefined)
            updateData.sortOrder = sortOrder;
        if (emoji !== undefined)
            updateData.emoji = emoji;
        // Handle default flag
        if (isDefault !== undefined) {
            updateData.isDefault = isDefault;
            // If setting as default, unset others
            if (isDefault) {
                await Disposition_1.default.updateMany({
                    createdBy: req.user?.id,
                    _id: { $ne: existing._id },
                }, { isDefault: false });
            }
        }
        return updateData;
    }
    /**
     * Override required fields for disposition creation
     */
    getRequiredFields() {
        return ['name'];
    }
    /**
     * Check if user has permission to update disposition
     * Users can only update their own dispositions
     */
    hasUpdatePermission(req, resource) {
        return resource.createdBy.toString() === req.user?.id || req.user?.role === 'admin';
    }
    /**
     * Check if user has permission to delete disposition
     * Users can only delete their own dispositions
     */
    hasDeletePermission(req, resource) {
        return resource.createdBy.toString() === req.user?.id || req.user?.role === 'admin';
    }
    /**
     * Override view permission to only show user's own dispositions
     */
    hasViewPermission(req, resource) {
        return resource.createdBy.toString() === req.user?.id || req.user?.role === 'admin';
    }
}
// Export singleton instance
exports.default = new DispositionController();
