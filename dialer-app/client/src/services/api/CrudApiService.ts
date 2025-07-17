import { BaseApiService, ListQueryParams, PaginatedResponse, ApiResponse } from './BaseApiService';

/**
 * Generic CRUD API Service
 * Provides standard CRUD operations for any resource
 */
export class CrudApiService<
  T,
  CreateDTO = Partial<T>,
  UpdateDTO = Partial<T>,
> extends BaseApiService {
  private resourcePath: string;

  constructor(resourcePath: string) {
    super('/api');
    this.resourcePath = resourcePath;
  }

  /**
   * Get all resources with pagination
   */
  async getAll(params?: ListQueryParams): Promise<PaginatedResponse<T>> {
    try {
      const queryString = params ? this.buildQueryString(params) : '';
      return await this.get<PaginatedResponse<T>>(`${this.resourcePath}${queryString}`);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single resource by ID
   */
  async getById(id: string): Promise<T> {
    try {
      const response = await this.get<ApiResponse<T>>(`${this.resourcePath}/${id}`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new resource
   */
  async create(data: CreateDTO): Promise<T> {
    try {
      const response = await this.post<ApiResponse<T>>(this.resourcePath, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing resource
   */
  async update(id: string, data: UpdateDTO): Promise<T> {
    try {
      const response = await this.put<ApiResponse<T>>(`${this.resourcePath}/${id}`, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Partially update an existing resource
   */
  async partialUpdate(id: string, data: Partial<UpdateDTO>): Promise<T> {
    try {
      const response = await this.patch<ApiResponse<T>>(`${this.resourcePath}/${id}`, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(id: string): Promise<void> {
    try {
      await this.delete(`${this.resourcePath}/${id}`);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Bulk delete resources
   */
  async bulkDelete(ids: string[]): Promise<{ deletedCount: number }> {
    try {
      const response = await this.post<ApiResponse<{ deletedCount: number }>>(
        `${this.resourcePath}/bulk-delete`,
        { ids }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Common method for querying resources with parameters
   */
  private async queryResources(params: ListQueryParams): Promise<PaginatedResponse<T>> {
    try {
      const queryString = this.buildQueryString(params);
      return await this.get<PaginatedResponse<T>>(`${this.resourcePath}${queryString}`);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Search resources
   */
  async search(
    searchTerm: string,
    params?: Omit<ListQueryParams, 'search'>
  ): Promise<PaginatedResponse<T>> {
    return this.queryResources({ ...params, search: searchTerm });
  }

  /**
   * Get resources by field value
   */
  async getByField(
    fieldName: string,
    value: any,
    params?: ListQueryParams
  ): Promise<PaginatedResponse<T>> {
    return this.queryResources({ ...params, [fieldName]: value });
  }

  /**
   * Check if a resource exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      await this.get(`${this.resourcePath}/${id}/exists`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      return this.handleError(error);
    }
  }

  /**
   * Get resource count
   */
  async count(params?: Omit<ListQueryParams, 'page' | 'limit'>): Promise<number> {
    try {
      const queryString = params ? this.buildQueryString(params) : '';
      const response = await this.get<ApiResponse<{ count: number }>>(
        `${this.resourcePath}/count${queryString}`
      );
      return response.data.count;
    } catch (error) {
      return this.handleError(error);
    }
  }
}
