import mongoose, { Document, Schema } from 'mongoose';

export interface IPasscode extends Document {
  code: string;
  isActive: boolean;
  maxUses: number;
  currentUses: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt?: Date;
  description?: string;
  // Methods
  isValid(): boolean;
  canBeUsed(): boolean;
  incrementUsage(): Promise<IPasscode>;
}

const passcodeSchema = new Schema<IPasscode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 6,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    maxUses: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    currentUses: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
    collection: 'passcodes',
  }
);

// Indexes for efficient validation queries
passcodeSchema.index({ code: 1, isActive: 1 });
passcodeSchema.index({ isActive: 1, expiresAt: 1 });
passcodeSchema.index({ createdBy: 1, createdAt: -1 });

// Method to check if passcode is valid (not expired and active)
passcodeSchema.methods.isValid = function(): boolean {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

// Method to check if passcode can be used (valid and not exceeded max uses)
passcodeSchema.methods.canBeUsed = function(): boolean {
  if (!this.isValid()) return false;
  if (this.currentUses >= this.maxUses) return false;
  return true;
};

// Method to increment usage count
passcodeSchema.methods.incrementUsage = async function(): Promise<IPasscode> {
  this.currentUses += 1;
  return await this.save();
};

// Pre-save middleware to ensure code is uppercase
passcodeSchema.pre('save', function(next) {
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase();
  }
  next();
});

const PasscodeModel = mongoose.model<IPasscode>('Passcode', passcodeSchema);

export default PasscodeModel; 