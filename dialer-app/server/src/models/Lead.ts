import mongoose, { Document, Schema } from 'mongoose';
import UserModel from './User';

export interface IPolicyDocument {
  _id?: mongoose.Types.ObjectId;
  clientId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  uploadDate: Date;
}

export interface ILeadInput {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  status?: 'New' | 'Contacted' | 'Follow-up' | 'Won' | 'Lost';
  notes?: string;
  notesMetadata?: any;
  assignedTo?: mongoose.Types.ObjectId;
  // Essential fields for lead cards
  zipcode?: string;
  dob?: string;
  height?: string;
  weight?: string;
  gender?: string;
  state?: string;
  // Additional fields
  city?: string;
  street1?: string;
  street2?: string;
  householdSize?: string;
  householdIncome?: string;
  military?: boolean;
  pregnant?: boolean;
  tobaccoUser?: boolean;
  hasPrescription?: boolean;
  hasMedicarePartsAB?: boolean;
  hasMedicalCondition?: boolean;
  medicalConditions?: string[];
  insuranceTimeframe?: string;
  // Campaign data
  campaignName?: string;
  product?: string;
  vendorName?: string;
  accountName?: string;
  bidType?: string;
  price?: number;
  sourceCode?: string;
  // Call tracking
  callLogId?: string;
  callDuration?: string;
  sourceHash?: string;
  subIdHash?: string;
  callHistory?: mongoose.Types.ObjectId[];
  // Legacy field support
  nextgenId?: string;
  phoneNumber?: string;
  company?: string;
  formattedJson?: string;
  disposition?: string;
  order?: number;
  // Policy documents
  policyDocuments?: IPolicyDocument[];
  // Add the new source field here
  source?: string;
  lastContactedAt?: Date;
  // Textdrip integration
  textdripContactId?: string;
  timeZone?: string;
  tenantId?: mongoose.Types.ObjectId;
}

export interface ILead extends ILeadInput, Document {
  createdAt: Date;
  updatedAt: Date;
  tenantId: mongoose.Types.ObjectId;
}

// Extend the model with static methods
export interface ILeadModel extends mongoose.Model<ILead> {
  upsertLead(payload: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    source?: string;
    tenantId?: mongoose.Types.ObjectId;
    price?: number;
    sourceCode?: string;
    [key: string]: any;
  }): Promise<{
    lead: ILead;
    isNew: boolean;
  }>;
}

// Policy document schema
const policyDocumentSchema = new Schema<IPolicyDocument>({
  clientId: { type: String, required: true },
  userId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
});

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, default: 'Blank Lead' },
    firstName: { type: String },
    lastName: { type: String },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      default: '',
    },
    phone: { type: String, default: '' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['New', 'Contacted', 'Follow-up', 'Won', 'Lost'],
      default: 'New',
    },
    source: {
      type: String,
      enum: ['NextGen', 'Marketplace', 'Self Generated', 'CSV Import', 'Manual Entry', 'Usha'],
      required: false, // We'll keep it non-required for backward compatibility
    },
    notes: { type: String, default: '' },
    notesMetadata: {
      type: Object,
      default: {},
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    // Essential fields for lead cards
    zipcode: { type: String },
    dob: { type: String },
    height: { type: String },
    weight: { type: String },
    gender: { type: String },
    state: { type: String, default: '' },
    // Additional fields
    city: { type: String, default: '' },
    street1: { type: String },
    street2: { type: String },
    householdSize: { type: String },
    householdIncome: { type: String },
    military: { type: Boolean, default: false },
    pregnant: { type: Boolean, default: false },
    tobaccoUser: { type: Boolean, default: false },
    hasPrescription: { type: Boolean, default: false },
    hasMedicarePartsAB: { type: Boolean, default: false },
    hasMedicalCondition: { type: Boolean, default: false },
    medicalConditions: [{ type: String }],
    insuranceTimeframe: { type: String },
    // Campaign data
    campaignName: { type: String },
    product: { type: String },
    vendorName: { type: String },
    accountName: { type: String },
    bidType: { type: String },
    price: { type: Number, default: 0 },
    sourceCode: { type: String },
    // Call tracking
    callLogId: { type: String },
    callDuration: { type: String },
    sourceHash: { type: String },
    subIdHash: { type: String },
    callHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Call' }],
    // Legacy field support
    nextgenId: { type: String },
    phoneNumber: { type: String },
    company: { type: String },
    formattedJson: { type: String },
    disposition: { type: String, default: '' },
    order: { type: Number, default: 0 },
    // Policy documents
    policyDocuments: [policyDocumentSchema],
    lastContactedAt: { type: Date },
    // Textdrip integration – store remote contact id to avoid duplicate creation
    textdripContactId: { type: String },
    timeZone: { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for faster queries
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ state: 1 });
leadSchema.index({ order: 1 });
leadSchema.index({ disposition: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1, createdAt: -1 });
leadSchema.index({ timeZone: 1 });
leadSchema.index({ source: 1, createdAt: -1 });
// Compound index for multi-tenant queries
leadSchema.index({ tenantId: 1, createdAt: -1 });
// Compound indexes for fast upsert lookups
leadSchema.index({ tenantId: 1, phone: 1 });
leadSchema.index({ tenantId: 1, email: 1 });
// Add state and zipcode setters
leadSchema.path('state').set(function (value: string) {
  console.log('Setting state:', value);
  return value;
});

leadSchema.path('zipcode').set(function (value: string) {
  console.log('Setting zipcode:', value);
  return value;
});

// Update the updatedAt timestamp before saving
leadSchema.pre('save', function (this: any, next) {
  this.updatedAt = new Date();

  // Ensure state and zipcode are properly set if they exist in the document
  if (this.isModified('state') && this.state === undefined) {
    this.state = '';
  }

  if (this.isModified('zipcode') && this.zipcode === undefined) {
    this.zipcode = '';
  }

  next();
});

/**
 * Upsert helper for webhook feeds (NextGen, etc.)
 * - Looks up a lead by phone number
 * - Updates existing lead data if found
 * - Inserts a new lead if not found
 */
leadSchema.statics.upsertLead = async function(payload) {
  try {
    // Ensure tenantId – fallback to first admin user if missing (legacy global webhook)
    if (!payload.tenantId) {
      try {
        const adminUser = await (UserModel as any).findOne({ role: 'admin' }).select('_id').lean();
        if (adminUser) {
          payload.tenantId = adminUser._id;
        }
      } catch (e) {
        console.error('Failed to lookup admin user for tenantId fallback', e);
      }
    }

    if (!payload.tenantId) {
      throw new Error('tenantId is required for lead upsert');
    }

    if (!payload.phone && !payload.email) {
      throw new Error('Either phone or email is required for lead upsert');
    }

    // Build lookup query – must include tenantId for strict multi-tenancy
    const query: { tenantId: mongoose.Types.ObjectId; phone?: string; email?: string } = {
      tenantId: payload.tenantId,
    } as any;
    if (payload.phone) query.phone = payload.phone;
    if (!payload.phone && payload.email) query.email = payload.email;

    // Check for existing lead FIRST to reliably compute isNew
    const existing = await this.findOne(query).lean();
    const isNew = !existing;

    if (isNew) {
      // Create new lead
      const lead = await this.create({ ...payload, createdAt: new Date(), updatedAt: new Date() });
      console.log(`Lead created: ${lead._id}, name: ${lead.name}, phone: ${lead.phone}`);
      return { lead, isNew: true };
    }

    // Otherwise update existing lead
    const updateFields = { ...payload, updatedAt: new Date() };
    // Prevent status overwrite unless explicitly provided
    if (!payload.status) delete (updateFields as any).status;

    const lead = await this.findOneAndUpdate(query, { $set: updateFields }, { new: true });
    console.log(`Lead updated: ${lead._id}, name: ${lead.name}, phone: ${lead.phone}`);
    return { lead, isNew: false };
  } catch (error) {
    console.error('Error in Lead.upsertLead:', error);
    throw error;
  }
};

const LeadModel = mongoose.model<ILead, ILeadModel>('Lead', leadSchema);
export default LeadModel;
