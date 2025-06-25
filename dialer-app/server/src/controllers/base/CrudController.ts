import { Request, Response } from 'express';
import { Document, Model } from 'mongoose';
import {
  handleControllerError,
  sendSuccessResponse,
  handleNotFound,
  validateRequiredFields,
  createPaginationMeta,
  PaginationMeta,
} from '../../utils/controllerUtils';

/**
 * Base request interface with common query parameters
 */
export interface CrudRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
  query: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    search?: string;
    [key: string]: any;
  };
}

/**
 * Response wrapper for paginated results
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Options for CRUD operations
 */
export interface CrudOptions {
  populateFields?: string | string[];
  selectFields?: string;
  searchFields?: string[];
  defaultSort?: string;
  defaultLimit?: number;
  allowedQueryFields?: string[];
}

/**
 * Generic CRUD Controller Base Class
 * Provides standard CRUD operations with built-in pagination, search, and error handling
 */
export abstract class CrudController<T extends Document> {
  protected model: Model<T>;
  protected resourceName: string;
  protected options: CrudOptions;

  constructor(model: Model<T>, resourceName: string, options: CrudOptions = {}) {
    this.model = model;
    this.resourceName = resourceName;
    this.options = {
      defaultLimit: 50,
      defaultSort: '-createdAt',
      ...options,
    };
  }

  /**
   * Get all resources with pagination and search
   */
  public getAll = async (req: CrudRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page || '1');
      const limit = parseInt(req.query.limit || String(this.options.defaultLimit));
      const sortBy = req.query.sortBy || this.options.defaultSort;
      const sortDirection = req.query.sortDirection === 'asc' ? '' : '-';
      const search = req.query.search;

      // Build query
      let query: any = this.buildBaseQuery(req);

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
      const sortObj: any = {};
      const sortField = sortBy || this.options.defaultSort || 'createdAt';
      sortObj[sortField] = sortDirection === '-' ? -1 : 1;

      let mongoQuery = this.model.find(query).sort(sortObj).skip(skip).limit(limit) as any;

      // Apply population if specified
      if (this.options.populateFields) {
        if (Array.isArray(this.options.populateFields)) {
          this.options.populateFields.forEach((field) => {
            mongoQuery = mongoQuery.populate(field);
          });
        } else {
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

      const response: PaginatedResponse<T> = {
        data: data as T[],
        pagination: createPaginationMeta(page, limit, totalItems),
      };

      sendSuccessResponse(res, response);
    } catch (error) {
      handleControllerError(error, res, `Failed to fetch ${this.resourceName} list`);
    }
  };

  /**
   * Get a single resource by ID
   */
  public getById = async (req: CrudRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      let query = this.model.findById(id) as any;

      // Apply population if specified
      if (this.options.populateFields) {
        if (Array.isArray(this.options.populateFields)) {
          this.options.populateFields.forEach((field) => {
            query = query.populate(field);
          });
        } else {
          query = query.populate(this.options.populateFields);
        }
      }

      // Apply field selection if specified
      if (this.options.selectFields) {
        query = query.select(this.options.selectFields);
      }

      const resource = await query.exec();

      if (!resource) {
        handleNotFound(res, this.resourceName);
        return;
      }

      // Check if user has permission to view this resource
      if (!this.hasViewPermission(req, resource)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      sendSuccessResponse(res, resource);
    } catch (error) {
      handleControllerError(error, res, `Failed to fetch ${this.resourceName}`);
    }
  };

  /**
   * Create a new resource
   */
  public create = async (req: CrudRequest, res: Response): Promise<void> => {
    try {
      // Validate required fields if specified
      const requiredFields = this.getRequiredFields();
      if (requiredFields.length > 0) {
        const validationError = validateRequiredFields(req.body, requiredFields);
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
        sendSuccessResponse(res, populated, `${this.resourceName} created successfully`, 201);
        return;
      }

      sendSuccessResponse(res, resource, `${this.resourceName} created successfully`, 201);
    } catch (error) {
      handleControllerError(error, res, `Failed to create ${this.resourceName}`);
    }
  };

  /**
   * Update a resource
   */
  public update = async (req: CrudRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Find the resource first to check permissions
      const existingResource = await this.model.findById(id);
      if (!existingResource) {
        handleNotFound(res, this.resourceName);
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
        handleNotFound(res, this.resourceName);
        return;
      }

      // Populate if needed
      if (this.options.populateFields) {
        const populated = await this.model
          .findById(updatedResource._id)
          .populate(this.options.populateFields);
        sendSuccessResponse(res, populated, `${this.resourceName} updated successfully`);
        return;
      }

      sendSuccessResponse(res, updatedResource, `${this.resourceName} updated successfully`);
    } catch (error) {
      handleControllerError(error, res, `Failed to update ${this.resourceName}`);
    }
  };

  /**
   * Delete a resource
   */
  public delete = async (req: CrudRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Find the resource first to check permissions
      const resource = await this.model.findById(id);
      if (!resource) {
        handleNotFound(res, this.resourceName);
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

      sendSuccessResponse(res, { id }, `${this.resourceName} deleted successfully`);
    } catch (error) {
      handleControllerError(error, res, `Failed to delete ${this.resourceName}`);
    }
  };

  /**
   * Bulk delete resources
   */
  public bulkDelete = async (req: CrudRequest, res: Response): Promise<void> => {
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

      sendSuccessResponse(
        res,
        {
          deletedCount: result.deletedCount,
          requestedCount: ids.length,
          authorizedCount: authorizedIds.length,
        },
        `${result.deletedCount} ${this.resourceName}s deleted successfully`,
      );
    } catch (error) {
      handleControllerError(error, res, `Failed to bulk delete ${this.resourceName}s`);
    }
  };

  // Abstract methods to be implemented by subclasses
  protected abstract buildBaseQuery(req: CrudRequest): any;
  protected abstract prepareCreateData(req: CrudRequest): Promise<any>;
  protected abstract prepareUpdateData(req: CrudRequest, existing: T): Promise<any>;

  // Hook methods that can be overridden
  protected getRequiredFields(): string[] {
    return [];
  }

  protected hasViewPermission(req: CrudRequest, resource: T): boolean {
    return true;
  }

  protected hasUpdatePermission(req: CrudRequest, resource: T): boolean {
    return true;
  }

  protected hasDeletePermission(req: CrudRequest, resource: T): boolean {
    return true;
  }

  protected async beforeDelete(resource: T): Promise<void> {
    // Override in subclass if cleanup is needed
  }
}
