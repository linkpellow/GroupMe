import mongoose from 'mongoose';

// Create schema with timestamps
const callSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: false,
    },
    phone: {
      type: String,
      required: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'outbound',
    },
    duration: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
); // Ensure timestamps are enabled

const CallModel = mongoose.model('Call', callSchema);

export default CallModel;
