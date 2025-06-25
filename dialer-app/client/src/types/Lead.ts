export interface Lead {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  status: string;
  source?: string;
  notes?: string;
  assignedTo?: string;
  nextgenId?: string;
  company?: string;
  state?: string;
  city?: string;
  zipcode?: string;
  height?: string;
  weight?: string;
  gender?: string;
  dob?: string;
  disposition?: string;
  order?: number;
  formattedJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadsResponse {
  leads: Lead[];
  pagination?: {
    total: number;
    page: number;
    pages: number;
  };
  total?: number;
}
