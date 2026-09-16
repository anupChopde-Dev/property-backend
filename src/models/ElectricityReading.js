import mongoose from 'mongoose';

const electricityReadingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
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
    previousReading: {
      type: Number,
      required: [true, 'Previous reading is required'],
      min: [0, 'Reading cannot be negative'],
    },
    currentReading: {
      type: Number,
      required: [true, 'Current reading is required'],
      min: [0, 'Reading cannot be negative'],
    },
    consumedUnits: {
      type: Number,
      min: [0, 'Consumed units cannot be negative'],
    },
    ratePerUnit: {
      type: Number,
      required: [true, 'Rate per unit is required'],
      min: [0, 'Rate cannot be negative'],
      default: 0,
    },
    energyAmount: {
      type: Number,
      min: [0, 'Energy amount cannot be negative'],
    },
    fixedCharge: {
      type: Number,
      default: 0,
      min: [0, 'Fixed charge cannot be negative'],
    },
    otherCharge: {
      type: Number,
      default: 0,
      min: [0, 'Other charge cannot be negative'],
    },
    totalAmount: {
      type: Number,
      min: [0, 'Total amount cannot be negative'],
    },
    readingDate: {
      type: Date,
      required: [true, 'Reading date is required'],
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

// Compound unique index - one reading per room per month
electricityReadingSchema.index(
  { room: 1, billingMonth: 1 },
  { unique: true, name: 'unique_electricity_reading_month' }
);

// Index for querying by property and month
electricityReadingSchema.index({ property: 1, billingMonth: 1 });

const ElectricityReading = mongoose.model('ElectricityReading', electricityReadingSchema);

export default ElectricityReading;
