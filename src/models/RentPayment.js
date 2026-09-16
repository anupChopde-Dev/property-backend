import mongoose from 'mongoose';

const rentPaymentSchema = new mongoose.Schema(
  {
    rentCharge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentCharge',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'],
        message: '{VALUE} is not a valid payment method',
      },
      default: 'CASH',
    },
    referenceNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference number cannot exceed 100 characters'],
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

// Index for querying payments by rent charge
rentPaymentSchema.index({ rentCharge: 1, paymentDate: -1 });

const RentPayment = mongoose.model('RentPayment', rentPaymentSchema);

export default RentPayment;
