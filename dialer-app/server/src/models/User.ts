import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { fieldEncryption } from 'mongoose-field-encryption';
import dotenv from 'dotenv';

// Ensure env loaded (in case not yet)
dotenv.config();

// Define interfaces for integrations
interface CalendlyIntegration {
  token: string;
  user: string;
  events: Array<{
    id: string;
    name: string;
    url: string;
    duration: number;
  }>;
  connectedAt: Date;
}

interface GroupMeIntegration {
  accessToken?: string;
  connectedAt?: Date;
  groups?: Record<string, string>;
  email?: string;
  name?: string;
}

interface Integrations {
  calendly?: CalendlyIntegration;
  // Add other integrations here as needed
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  username: string;
  phone?: string;
  profilePicture?: string;
  role: 'admin' | 'user';
  // Gmail integration fields
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
  gmailTokenExpiry?: Date;
  gmailConnected?: boolean;
  gmailEmail?: string;
  // GroupMe integration fields
  groupMe?: GroupMeIntegration;
  // TextDrip integration fields
  textdrip?: {
    baseUrl?: string;
    username?: string;
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpires?: Date;
    connectedAt?: Date;
  };
  // Integrations object
  integrations?: Integrations;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    phone: { type: String },
    profilePicture: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    // Gmail integration fields
    gmailAccessToken: { type: String },
    gmailRefreshToken: { type: String },
    gmailTokenExpiry: { type: Date },
    gmailConnected: { type: Boolean, default: false },
    gmailEmail: { type: String },
    // GroupMe integration fields
    groupMe: {
      accessToken: { type: String },
      connectedAt: { type: Date },
      groups: { type: Map, of: String },
      email: { type: String },
      name: { type: String },
    },
    // TextDrip integration fields
    textdrip: {
      baseUrl: { type: String },
      username: { type: String },
      apiKey: { type: String },
      accessToken: { type: String },
      refreshToken: { type: String },
      tokenExpires: { type: Date },
      connectedAt: { type: Date },
    },
    // Integrations object
    integrations: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Field-level encryption for sensitive TextDrip creds
const ENC_SECRET = process.env.ENCRYPTION_SECRET || 'default_please_override';
userSchema.plugin(fieldEncryption, {
  fields: ['textdrip.apiKey', 'textdrip.username'],
  secret: ENC_SECRET,
  saltGenerator: (secret: string) => secret.slice(0, 16), // deterministic salt for symmetric decrypt
});

export default model<IUser>('User', userSchema);
