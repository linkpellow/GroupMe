export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent';
}

export interface Lead {
  _id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipcode: string;
  dob: string;
  height: string;
  weight: string;
  gender: string;
  state: string;
  disposition: string;
  notes: string;
  source: string;
  status: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LeadsResponse {
  leads: Lead[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface SyncResponse {
  success: boolean;
  message: string;
  stats: {
    totalProcessed: number;
    newLeads: number;
    updatedLeads: number;
    errors: number;
  };
}

export interface DetachedLead {
  id: string;
  lead: Lead;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface DragData {
  x: number;
  y: number;
}

export interface ResizeData {
  size: { width: number; height: number };
}
