import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [150, 'Full name cannot exceed 150 characters'],
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    permanentAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: [100, 'Occupation cannot exceed 100 characters'],
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    leavingDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'MOVED_OUT'],
        message: '{VALUE} is not a valid status',
      },
      default: 'ACTIVE',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    photo: {
      data: { type: Buffer, default: null },
      mimeType: {
        type: String,
        enum: {
          values: ['image/jpeg', 'image/png', 'image/jpg'],
          message: '{VALUE} is not a supported image type',
        },
      },
      originalName: { type: String, trim: true },
      size: { type: Number, min: 0 },
      uploadedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Index for searching tenants
tenantSchema.index({ room: 1, status: 1 });

// Virtual: whether a photo exists (without sending the buffer in JSON)
tenantSchema.virtual('hasPhoto').get(function () {
  return !!(this.photo && this.photo.data && this.photo.data.length > 0);
});

tenantSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    // Never leak the raw binary in JSON responses; fetch via /photo endpoint
    delete ret.photo;
    return ret;
  },
});
tenantSchema.set('toObject', { virtuals: true });

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
