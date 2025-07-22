import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email: string;
  zipcode?: string;
  state?: string;
  city?: string;
  street1?: string;
  street2?: string;
  status?: string;
  source?: string;
  disposition?: string;
  notes?: string;
  assignedTo?: mongoose.Types.ObjectId;
  height?: string;
  gender?: string;
  // New fields as required
  dob?: Date;
  weight?: number;
  sourceCode: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const LeadSchema = new Schema<ILead>({
  name: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  zipcode: { type: String },
  state: { type: String },
  city: { type: String },
  street1: { type: String },
  street2: { type: String },
  status: { type: String, default: 'New' },
  source: { type: String },
  disposition: { type: String },
  notes: { type: String },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  height: { type: String },
  gender: { type: String },
  // New fields as specified in the problem statement
  dob: { type: Date },                    // e.g. 1987‑04‑12
  weight: { type: Number },               // pounds or kg – your choice
  sourceCode: { type: String, default: 'NextGen', index: true }
}, {
  timestamps: true
});

// Upsert function as specified in the problem statement
export async function upsertLead(raw: any): Promise<{ lead: ILead; isNew: boolean }> {
  const mapped = {
    // Existing mappings
    name: raw.name || `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone,
    email: raw.email,
    zipcode: raw.zipcode,
    state: raw.state,
    city: raw.city,
    street1: raw.street1,
    street2: raw.street2,
    status: raw.status || 'New',
    source: raw.source || 'NextGen',
    disposition: raw.disposition,
    notes: raw.notes,
    assignedTo: raw.assignedTo,
    height: raw.height,
    gender: raw.gender,
    // New field mappings as specified
    dob: raw.dob ? new Date(raw.dob) : undefined,
    weight: raw.weight ? Number(raw.weight) : undefined,
    sourceCode: raw.source_hash ?? raw.campaign_name ?? 'NextGen'
  };

  return _internalUpsert(mapped);
}

async function _internalUpsert(mapped: any): Promise<{ lead: ILead; isNew: boolean }> {
  try {
    // Try to find existing lead by phone or email
    const existingLead = await Lead.findOne({
      $or: [
        { phone: mapped.phone },
        { email: mapped.email }
      ]
    });

    if (existingLead) {
      // Update existing lead
      const updated = await Lead.findByIdAndUpdate(existingLead._id, mapped, { 
        new: true, 
        runValidators: true 
      });
      if (!updated) {
        throw new Error('Failed to update existing lead');
      }
      return { lead: updated, isNew: false };
    } else {
      // Create new lead
      const newLead = await Lead.create(mapped);
      return { lead: newLead, isNew: true };
    }
  } catch (error) {
    throw error;
  }
}

const Lead = mongoose.model<ILead>('Lead', LeadSchema);
export default Lead;