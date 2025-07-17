import { CrudApiService } from './CrudApiService';
import { PaginatedResponse, ApiResponse } from './BaseApiService';

/**
 * Lead interface
 */
export interface Lead {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  source?: 'NextGen' | 'Marketplace' | 'Self Generated' | 'CSV Import' | 'Manual Entry' | 'Usha';
  disposition?: string;
  notes?: string;
  lastCallDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

/**
 * Lead creation DTO
 */
export interface CreateLeadDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  source: string;
  notes?: string;
}

/**
 * Lead update DTO
 */
export interface UpdateLeadDTO extends Partial<CreateLeadDTO> {
  disposition?: string;
  notes?: string;
}

/**
 * Lead API Service
 * Provides all lead-related API operations
 */
export class LeadApiService extends CrudApiService<Lead, CreateLeadDTO, UpdateLeadDTO> {
  constructor() {
    super('/leads');
  }

  /**
   * Get leads by state
   */
  async getByState(state: string, params?: any): Promise<PaginatedResponse<Lead>> {
    return this.getByField('state', state, params);
  }

  /**
   * Get leads by disposition
   */
  async getByDisposition(disposition: string, params?: any): Promise<PaginatedResponse<Lead>> {
    return this.getByField('disposition', disposition, params);
  }

  /**
   * Get leads by source
   */
  async getBySource(source: string, params?: any): Promise<PaginatedResponse<Lead>> {
    return this.getByField('source', source, params);
  }

  /**
   * Import leads from CSV
   */
  async importFromCSV(file: File, source?: string): Promise<{ imported: number; errors: any[] }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (source) {
        formData.append('source', source);
      }

      const response = await this.post<ApiResponse<{ imported: number; errors: any[] }>>(
        '/leads/import',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Export leads to CSV
   */
  async exportToCSV(params?: any): Promise<Blob> {
    try {
      const queryString = params ? this.buildQueryString(params) : '';
      const response = await this.axiosInstance.get(`/leads/export${queryString}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update lead disposition
   */
  async updateDisposition(leadId: string, dispositionId: string, notes?: string): Promise<Lead> {
    return this.partialUpdate(leadId, { disposition: dispositionId, notes });
  }

  /**
   * Bulk update leads
   */
  async bulkUpdate(
    leadIds: string[],
    updates: Partial<UpdateLeadDTO>
  ): Promise<{ updated: number }> {
    try {
      const response = await this.post<ApiResponse<{ updated: number }>>('/leads/bulk-update', {
        ids: leadIds,
        updates,
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get lead statistics
   */
  async getStatistics(params?: any): Promise<{
    total: number;
    byState: Record<string, number>;
    bySource: Record<string, number>;
    byDisposition: Record<string, number>;
  }> {
    try {
      const queryString = params ? this.buildQueryString(params) : '';
      const response = await this.get<ApiResponse<any>>(`/leads/statistics${queryString}`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get leads with no disposition
   */
  async getUndispositioned(params?: any): Promise<PaginatedResponse<Lead>> {
    const queryParams = { ...params, disposition: 'null' };
    return this.getAll(queryParams);
  }

  /**
   * Search leads by phone or email
   */
  async searchByContact(searchTerm: string): Promise<Lead[]> {
    try {
      const response = await this.get<ApiResponse<Lead[]>>(
        `/leads/search-contact?q=${encodeURIComponent(searchTerm)}`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export singleton instance
export const leadApiService = new LeadApiService();
