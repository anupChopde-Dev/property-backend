import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
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
      default: null,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'REPAIR',
          'MAINTENANCE',
          'PLUMBING',
          'ELECTRICAL',
          'CLEANING',
          'PAINTING',
          'PROPERTY_TAX',
          'OTHER',
        ],
        message: '{VALUE} is not a valid category',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
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

// Index for querying by property and date
expenseSchema.index({ property: 1, date: -1 });
expenseSchema.index({ property: 1, room: 1 });

// Partial index for room expenses (when room is specified)
expenseSchema.index({ property: 1, room: 1 }, { partialFilterExpression: { room: { $ne: null } } });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
