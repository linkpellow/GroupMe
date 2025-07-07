import mongoose, { Document, Schema } from 'mongoose';

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
  price?: string;
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
}

export interface ILead extends ILeadInput, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Extend the model with static methods
export interface ILeadModel extends mongoose.Model<ILead> {
  upsertLead(payload: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    source?: string;
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
    price: { type: String },
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
leadSchema.pre('save', function (next) {
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
    // Required fields check
    if (!payload.phone && !payload.email) {
      throw new Error('Either phone or email is required for lead upsert');
    }
    
    // Create a query to find existing lead by phone or email
    const query: {phone?: string; email?: string} = {};
    if (payload.phone) {
      query.phone = payload.phone;
    } else if (payload.email) {
      query.email = payload.email;
    }
    
    // Create update document
    const updateDoc = {
      $set: {
        ...payload,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date(),
        status: payload.status || 'New'
      }
    };
    
    // Perform upsert operation
    const options = { 
      upsert: true, 
      new: true 
    };
    
    const lead = await this.findOneAndUpdate(query, updateDoc, options);
    
    // Determine if this was a new insert or an update
    const isNew = lead.createdAt && lead.updatedAt && 
                  lead.createdAt.getTime() === lead.updatedAt.getTime();
    
    return {
      lead,
      isNew
    };
  } catch (error) {
    console.error('Error in Lead.upsertLead:', error);
    throw error;
  }
};

const LeadModel = mongoose.model<ILead, ILeadModel>('Lead', leadSchema);
export default LeadModel;
