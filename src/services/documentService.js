import { Tenant, TenantDocument, Room, Property } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';
import { config } from '../config/index.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload a document for a tenant
 */
export const uploadDocument = async (tenantId, ownerId, uploadData) => {
  const { imageSlot, originalFileName, mimeType, size, filePath } = uploadData;

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }

  // Verify ownership
  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Tenant not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Tenant not found');
  }

  // Check if tenant is active
  if (tenant.status !== 'ACTIVE') {
    throw new ApiError(400, 'Can only upload documents for active tenants');
  }

  // Check if slot is already occupied
  const existingDoc = await TenantDocument.findOne({ tenant: tenantId, imageSlot });
  if (existingDoc) {
    // Delete old file if it exists
    await deleteFileFromStorage(existingDoc.storageKey);
    // Remove old document record
    await TenantDocument.findByIdAndDelete(existingDoc._id);
  }

  // Generate storage key
  const storageKey = `tenants/${tenantId}/documents/${imageSlot}/${uuidv4()}-${originalFileName}`;

  // Move file to permanent storage location
  const finalPath = await moveFileToStorage(filePath, storageKey);

  const document = new TenantDocument({
    tenant: tenantId,
    imageSlot,
    originalFileName,
    mimeType,
    storageKey,
    size,
  });

  await document.save();

  const url = await getDocumentUrl(storageKey);

  return {
    ...document.toJSON(),
    url,
  };
};

/**
 * Get all documents for a tenant
 */
export const getTenantDocuments = async (tenantId, ownerId) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }

  // Verify ownership
  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Tenant not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Tenant not found');
  }

  const documents = await TenantDocument.find({ tenant: tenantId }).sort({ imageSlot: 1 });

  const results = [];
  for (const doc of documents) {
    const url = await getDocumentUrl(doc.storageKey);
    results.push({
      ...doc.toJSON(),
      url,
    });
  }

  return results;
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId, ownerId) => {
  const document = await TenantDocument.findById(documentId);
  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  // Verify ownership
  const tenant = await Tenant.findById(document.tenant);
  if (!tenant) {
    throw new ApiError(404, 'Document not found');
  }

  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Document not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Document not found');
  }

  // Delete file from storage
  await deleteFileFromStorage(document.storageKey);

  // Delete document record
  await TenantDocument.findByIdAndDelete(documentId);

  return { message: 'Document deleted successfully' };
};

/**
 * Get signed/download URL for a document
 */
export const getDocumentDownloadUrl = async (documentId, ownerId) => {
  const document = await TenantDocument.findById(documentId);
  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  // Verify ownership
  const tenant = await Tenant.findById(document.tenant);
  if (!tenant) {
    throw new ApiError(404, 'Document not found');
  }

  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Document not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Document not found');
  }

  const url = await getDocumentUrl(document.storageKey);

  return {
    document: document.toJSON(),
    url,
  };
};

/**
 * Get document URL (public or signed)
 */
const getDocumentUrl = async (storageKey) => {
  if (config.storage.provider === 'local') {
    // For local storage, return the file path
    // In production, this would be served through a secure endpoint
    return `/api/documents/${encodeURIComponent(storageKey)}/view`;
  }

  // For S3, generate signed URL
  // This would use AWS SDK or similar
  return `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com/${storageKey}?signature=...`;
};

/**
 * Move file to permanent storage
 */
const moveFileToStorage = async (tempPath, storageKey) => {
  if (config.storage.provider === 'local') {
    const storagePath = path.resolve(config.storage.localPath, storageKey);
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    const finalPath = await fs.rename(tempPath, storagePath);
    return finalPath;
  }

  // For S3, upload file
  // This would use AWS SDK or similar
  throw new Error('S3 storage not implemented in this example');
};

/**
 * Delete file from storage
 */
const deleteFileFromStorage = async (storageKey) => {
  if (config.storage.provider === 'local') {
    const filePath = path.resolve(config.storage.localPath, storageKey);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`File not found for deletion: ${filePath}`);
    }
  } else {
    // For S3, delete object
    // This would use AWS SDK or similar
  }
};

/**
 * Serve document file (for local storage)
 */
export const serveDocumentFile = async (storageKey) => {
  if (config.storage.provider !== 'local') {
    throw new ApiError(404, 'Document not available');
  }

  const filePath = path.resolve(config.storage.localPath, storageKey);

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new ApiError(404, 'Document not found');
    }
    return {
      path: filePath,
      mimeType: storageKey.includes('.png') ? 'image/png' :
                storageKey.includes('.jpg') || storageKey.includes('.jpeg') ? 'image/jpeg' : 'application/octet-stream',
    };
  } catch (error) {
    throw new ApiError(404, 'Document not found');
  }
};
