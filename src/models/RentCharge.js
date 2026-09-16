import mongoose from 'mongoose';

const rentChargeSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
    billingMonth: {
      type: String,
      required: [true, 'Billing month is required'],
      match: [/^\d{4}-\d{2}$/, 'Billing month must be in YYYY-MM format'],
      index: true,
    },
    rentAmount: {
      type: Number,
      required: [true, 'Rent amount is required'],
      min: [0, 'Rent amount cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'],
        message: '{VALUE} is not a valid status',
      },
      default: 'PENDING',
    },
    dueDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - one rent charge per room per month
rentChargeSchema.index(
  { room: 1, billingMonth: 1 },
  { unique: true, name: 'unique_rent_charge_month' }
);

// Index for querying by status
rentChargeSchema.index({ status: 1 });
rentChargeSchema.index({ tenant: 1 });

// This will be calculated in service layer
// No virtual needed - calculated dynamically

rentChargeSchema.set('toJSON', { virtuals: true });
rentChargeSchema.set('toObject', { virtuals: true });

const RentCharge = mongoose.model('RentCharge', rentChargeSchema);

export default RentCharge;
