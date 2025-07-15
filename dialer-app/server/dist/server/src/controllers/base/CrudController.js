"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudController = void 0;
const controllerUtils_1 = require("../../utils/controllerUtils");
/**
 * Generic CRUD Controller Base Class
 * Provides standard CRUD operations with built-in pagination, search, and error handling
 */
class CrudController {
    constructor(model, resourceName, options = {}) {
        /**
         * Get all resources with pagination and search
         */
        this.getAll = async (req, res) => {
            try {
                const page = parseInt(req.query.page || '1');
                const limit = parseInt(req.query.limit || String(this.options.defaultLimit));
                const sortBy = req.query.sortBy || this.options.defaultSort;
                const sortDirection = req.query.sortDirection === 'asc' ? '' : '-';
                const search = req.query.search;
                // Build query
                let query = this.buildBaseQuery(req);
                // Add search if provided
                if (search && this.options.searchFields?.length) {
                    const searchConditions = this.options.searchFields.map((field) => ({
                        [field]: { $regex: search, $options: 'i' },
                    }));
                    query = { ...query, $or: searchConditions };
                }
                // Add custom filters from query params
                if (this.options.allowedQueryFields) {
                    this.options.allowedQueryFields.forEach((field) => {
                        if (req.query[field]) {
                            query[field] = req.query[field];
                        }
                    });
                }
                // Execute query with pagination
                const skip = (page - 1) * limit;
                const sortObj = {};
                const sortField = sortBy || this.options.defaultSort || 'createdAt';
                sortObj[sortField] = sortDirection === '-' ? -1 : 1;
                let mongoQuery = this.model.find(query).sort(sortObj).skip(skip).limit(limit);
                // Apply population if specified
                if (this.options.populateFields) {
                    if (Array.isArray(this.options.populateFields)) {
                        this.options.populateFields.forEach((field) => {
                            mongoQuery = mongoQuery.populate(field);
                        });
                    }
                    else {
                        mongoQuery = mongoQuery.populate(this.options.populateFields);
                    }
                }
                // Apply field selection if specified
                if (this.options.selectFields) {
                    mongoQuery = mongoQuery.select(this.options.selectFields);
                }
                // Execute queries in parallel
                const [data, totalItems] = await Promise.all([
                    mongoQuery.exec(),
                    this.model.countDocuments(query),
                ]);
                const response = {
                    data: data,
                    pagination: (0, controllerUtils_1.createPaginationMeta)(page, limit, totalItems),
                };
                (0, controllerUtils_1.sendSuccessResponse)(res, response);
            }
            catch (error) {
                (0, controllerUtils_1.handleControllerError)(error, res, `Failed to fetch ${this.resourceName} list`);
            }
        };
        /**
         * Get a single resource by ID
         */
        this.getById = async (req, res) => {
            try {
                const { id } = req.params;
                let query = this.model.findById(id);
                // Apply population if specified
                if (this.options.populateFields) {
                    if (Array.isArray(this.options.populateFields)) {
                        this.options.populateFields.forEach((field) => {
                            query = query.populate(field);
                        });
                    }
                    else {
                        query = query.populate(this.options.populateFields);
                    }
                }
                // Apply field selection if specified
                if (this.options.selectFields) {
                    query = query.select(this.options.selectFields);
                }
                const resource = await query.exec();
                if (!resource) {
                    (0, controllerUtils_1.handleNotFound)(res, this.resourceName);
                    return;
                }
                // Check if user has permission to view this resource
                if (!this.hasViewPermission(req, resource)) {
                    res.status(403).json({ error: 'Forbidden' });
                    return;
                }
                (0, controllerUtils_1.sendSuccessResponse)(res, resource);
            }
            catch (error) {
                (0, controllerUtils_1.handleControllerError)(error, res, `Failed to fetch ${this.resourceName}`);
            }
        };
        /**
         * Create a new resource
         */
        this.create = async (req, res) => {
            try {
                // Validate required fields if specified
                const requiredFields = this.getRequiredFields();
                if (requiredFields.length > 0) {
                    const validationError = (0, controllerUtils_1.validateRequiredFields)(req.body, requiredFields);
                    if (validationError) {
                        res.status(400).json({ error: validationError });
                        return;
                    }
                }
                // Prepare data for creation
                const data = await this.prepareCreateData(req);
                // Create the resource
                const resource = await this.model.create(data);
                // Populate if needed
                if (this.options.populateFields) {
                    const populated = await this.model
                        .findById(resource._id)
                        .populate(this.options.populateFields);
                    (0, controllerUtils_1.sendSuccessResponse)(res, populated, `${this.resourceName} created successfully`, 201);
                    return;
                }
                (0, controllerUtils_1.sendSuccessResponse)(res, resource, `${this.resourceName} created successfully`, 201);
            }
            catch (error) {
                (0, controllerUtils_1.handleControllerError)(error, res, `Failed to create ${this.resourceName}`);
            }
        };
        /**
         * Update a resource
         */
        this.update = async (req, res) => {
            try {
                const { id } = req.params;
                // Find the resource first to check permissions
                const existingResource = await this.model.findById(id);
                if (!existingResource) {
                    (0, controllerUtils_1.handleNotFound)(res, this.resourceName);
                    return;
                }
                // Check permissions
                if (!this.hasUpdatePermission(req, existingResource)) {
                    res.status(403).json({ error: 'Forbidden' });
                    return;
                }
                // Prepare update data
                const updateData = await this.prepareUpdateData(req, existingResource);
                // Update the resource
                const updatedResource = await this.model.findByIdAndUpdate(id, updateData, {
                    new: true,
                    runValidators: true,
                });
                if (!updatedResource) {
                    (0, controllerUtils_1.handleNotFound)(res, this.resourceName);
                    return;
                }
                // Populate if needed
                if (this.options.populateFields) {
                    const populated = await this.model
                        .findById(updatedResource._id)
                        .populate(this.options.populateFields);
                    (0, controllerUtils_1.sendSuccessResponse)(res, populated, `${this.resourceName} updated successfully`);
                    return;
                }
                (0, controllerUtils_1.sendSuccessResponse)(res, updatedResource, `${this.resourceName} updated successfully`);
            }
            catch (error) {
                (0, controllerUtils_1.handleControllerError)(error, res, `Failed to update ${this.resourceName}`);
            }
        };
        /**
         * Delete a resource
         */
        this.delete = async (req, res) => {
            try {
                const { id } = req.params;
                // Find the resource first to check permissions
                const resource = await this.model.findById(id);
                if (!resource) {
                    (0, controllerUtils_1.handleNotFound)(res, this.resourceName);
                    return;
                }
                // Check permissions
                if (!this.hasDeletePermission(req, resource)) {
                    res.status(403).json({ error: 'Forbidden' });
                    return;
                }
                // Perform any cleanup before deletion
                await this.beforeDelete(resource);
                // Delete the resource
                await this.model.findByIdAndDelete(id);
                (0, controllerUtils_1.sendSuccessResponse)(res, { id }, `${this.resourceName} deleted successfully`);
            }
            catch (error) {
                (0, controllerUtils_1.handleControllerError)(error, res, `Failed to delete ${this.resourceName}`);
            }
        };
        /**
         * Bulk delete resources
         */
        this.bulkDelete = async (req, res) => {
            try {
                const { ids } = req.body;
                if (!Array.isArray(ids) || ids.length === 0) {
                    res.status(400).json({ error: 'Invalid or empty ids array' });
                    return;
                }
                // Find all resources to check permissions
                const resources = await this.model.find({ _id: { $in: ids } });
                // Check permissions for each resource
                const authorizedIds = resources
                    .filter((resource) => this.hasDeletePermission(req, resource))
                    .map((resource) => resource._id);
                if (authorizedIds.length === 0) {
                    res.status(403).json({ error: 'No permission to delete any of the specified resources' });
                    return;
                }
                // Perform cleanup for each resource
                for (const resource of resources.filter((r) => authorizedIds.includes(r._id))) {
                    await this.beforeDelete(resource);
                }
                // Delete authorized resources
                const result = await this.model.deleteMany({ _id: { $in: authorizedIds } });
                (0, controllerUtils_1.sendSuccessResponse)(res, {
                    deletedCount: result.deletedCount,
                    requestedCount: ids.length,
                    authorizedCount: authorizedIds.length,
                }, `${result.deletedCount} ${this.resourceName}s deleted successfully`);
            }
            catch (error) {
                (0, controllerUtils_1.handleControllerError)(error, res, `Failed to bulk delete ${this.resourceName}s`);
            }
        };
        this.model = model;
        this.resourceName = resourceName;
        this.options = {
            defaultLimit: 50,
            defaultSort: '-createdAt',
            ...options,
        };
    }
    // Hook methods that can be overridden
    getRequiredFields() {
        return [];
    }
    hasViewPermission(req, resource) {
        return true;
    }
    hasUpdatePermission(req, resource) {
        return true;
    }
    hasDeletePermission(req, resource) {
        return true;
    }
    async beforeDelete(resource) {
        // Override in subclass if cleanup is needed
    }
}
exports.CrudController = CrudController;
