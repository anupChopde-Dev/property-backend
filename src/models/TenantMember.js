import mongoose from 'mongoose';

const tenantMemberSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters'],
      enum: {
        values: [
          'Primary',
          'Spouse',
          'Son',
          'Daughter',
          'Father',
          'Mother',
          'Brother',
          'Sister',
          'Other Family',
          'Other',
        ],
        message: '{VALUE} is not a valid relationship',
      },
    },
    dateOfBirth: {
      type: Date,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for members within a tenant
tenantMemberSchema.index({ tenant: 1, name: 1 });

const TenantMember = mongoose.model('TenantMember', tenantMemberSchema);

export default TenantMember;
