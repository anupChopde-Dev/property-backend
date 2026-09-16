import mongoose from 'mongoose';

const tenantDocumentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    imageSlot: {
      type: Number,
      required: true,
      enum: {
        values: [1, 2],
        message: 'Image slot must be 1 or 2',
      },
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: {
        values: ['image/jpeg', 'image/png', 'image/jpg'],
        message: '{VALUE} is not a supported image type',
      },
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: [0, 'File size cannot be negative'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Using uploadedAt instead
  }
);

// Compound unique index - one document per slot per tenant
tenantDocumentSchema.index(
  { tenant: 1, imageSlot: 1 },
  { unique: true, name: 'unique_tenant_document_slot' }
);

const TenantDocument = mongoose.model('TenantDocument', tenantDocumentSchema);

export default TenantDocument;
