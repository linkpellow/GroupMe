// Base classes
export { BaseApiService } from './BaseApiService';
export { CrudApiService } from './CrudApiService';

// Types
export type {
  ApiResponse,
  PaginationMeta,
  PaginatedResponse,
  ListQueryParams,
} from './BaseApiService';

// Lead API
import { LeadApiService, leadApiService } from './LeadApiService';
export { LeadApiService, leadApiService };
export type { Lead, CreateLeadDTO, UpdateLeadDTO } from './LeadApiService';

// Disposition API
import { CrudApiService } from './CrudApiService';

export interface Disposition {
  _id: string;
  name: string;
  color: string;
  isDefault: boolean;
  createdBy: string;
  sortOrder: number;
  emoji?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const dispositionApiService = new CrudApiService<Disposition>('/dispositions');

// Campaign API
export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const campaignApiService = new CrudApiService<Campaign>('/campaigns');

// User API
export interface User {
  _id: string;
  email: string;
  name: string;
  username: string;
  role: 'admin' | 'user';
  phone?: string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const userApiService = new CrudApiService<User>('/users');

// Email Template API
export interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  body: string;
  tags?: string[];
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const emailTemplateApiService = new CrudApiService<EmailTemplate>('/email-templates');

// Note API
export interface Note {
  _id: string;
  content: string;
  leadId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const noteApiService = new CrudApiService<Note>('/notes');

// Export all services as a namespace for convenience
export const api = {
  leads: leadApiService,
  dispositions: dispositionApiService,
  campaigns: campaignApiService,
  users: userApiService,
  emailTemplates: emailTemplateApiService,
  notes: noteApiService,
};
