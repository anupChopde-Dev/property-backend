import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number/name is required'],
      trim: true,
      maxlength: [50, 'Room number cannot exceed 50 characters'],
    },
    floor: {
      type: String,
      trim: true,
      maxlength: [50, 'Floor cannot exceed 50 characters'],
    },
    monthlyRent: {
      type: Number,
      default: 0,
      min: [0, 'Monthly rent cannot be negative'],
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['VACANT', 'OCCUPIED', 'MAINTENANCE'],
        message: '{VALUE} is not a valid status',
      },
      default: 'VACANT',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique room within property
roomSchema.index({ property: 1, roomNumber: 1 }, { unique: true });

// Virtual for getting current tenant
roomSchema.virtual('currentTenant', {
  ref: 'Tenant',
  localField: '_id',
  foreignField: 'room',
  justOne: true,
  match: { status: 'ACTIVE' },
});

roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

const Room = mongoose.model('Room', roomSchema);

export default Room;
