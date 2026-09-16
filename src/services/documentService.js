import mongoose from 'mongoose';
import { Tenant, TenantDocument, Room, Property } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';
import { config } from '../config/index.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Verify the tenant exists and belongs to the owner (via room -> property).
 */
const assertTenantAccess = async (tenantId, ownerId) => {
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw new ApiError(404, 'Tenant not found');
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }

  const room = await Room.findById(tenant.room);
  const property = room ? await Property.findById(room.property) : null;
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Tenant not found');
  }

  return tenant;
};

/**
 * Verify the document exists and belongs to the owner.
 */
const assertDocumentAccess = async (documentId, ownerId) => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new ApiError(404, 'Document not found');
  }

  const document = await TenantDocument.findById(documentId);
  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  await assertTenantAccess(document.tenant, ownerId);
  return document;
};

const assertLocalStorage = () => {
  if (config.storage.provider !== 'local') {
    throw new ApiError(500, 'Only local storage is supported');
  }
};

const resolveStoragePath = (storageKey) =>
  path.resolve(config.storage.localPath, storageKey);

/**
 * Strip characters that could escape the storage directory or break URLs.
 */
const sanitizeFileName = (fileName) => {
  const sanitized = String(fileName || 'document')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._]+/, '')
    .slice(-120);
  return sanitized || 'document';
};

const buildStorageKey = (tenantId, imageSlot, fileName) =>
  `tenants/${tenantId}/documents/${imageSlot}/${uuidv4()}-${sanitizeFileName(fileName)}`;

/**
 * Persist an uploaded document to local storage. Accepts either an in-memory
 * buffer (multipart uploads) or a temp file path (legacy disk uploads).
 */
const writeFileToStorage = async ({ buffer, filePath }, storageKey) => {
  assertLocalStorage();

  const storagePath = resolveStoragePath(storageKey);
  await fs.mkdir(path.dirname(storagePath), { recursive: true });

  if (buffer) {
    await fs.writeFile(storagePath, buffer);
    return storagePath;
  }

  if (filePath) {
    try {
      await fs.rename(filePath, storagePath);
    } catch (error) {
      // Fallback for cross-device moves (rename fails with EXDEV)
      await fs.copyFile(filePath, storagePath);
      await fs.unlink(filePath).catch(() => {});
    }
    return storagePath;
  }

  throw new ApiError(400, 'No file content provided');
};

const deleteFileFromStorage = async (storageKey) => {
  if (config.storage.provider !== 'local' || !storageKey) return;

  try {
    await fs.unlink(resolveStoragePath(storageKey));
  } catch (error) {
    console.warn(`File not found for deletion: ${storageKey}`);
  }
};

const buildAbsoluteUrl = (pathOnly) => `${config.apiBaseUrl}${pathOnly}`;

/**
 * Public shape of a document.
 *
 * `url` and `path` are relative to the API base URL (the frontend prepends
 * NEXT_PUBLIC_API_URL: `${API_BASE}${doc.url}` › `${API_BASE}`).
 * `absoluteUrl` is provided for clients that need a full URL.
 * Append `?token=<jwt>` when the browser cannot send an Authorization header.
 */
export const toDocumentResponse = (document) => {
  const plain =
    document && typeof document.toJSON === 'function' ? document.toJSON() : { ...document };

  delete plain.__v;

  const filePath = `/api/documents/${plain._id}/file`;
  const absolute = buildAbsoluteUrl(filePath);
  return {
    ...plain,
    path: filePath,
    url: absolute,
    absoluteUrl: absolute,
    downloadPath: `${filePath}?download=1`,
  };
};

/**
 * Upload (or replace) a document for a tenant.
 *
 * @param {string} tenantId
 * @param {string} ownerId
 * @param {{imageSlot: number, originalFileName: string, mimeType: string, size: number, buffer?: Buffer, filePath?: string}} uploadData
 */
export const uploadDocument = async (tenantId, ownerId, uploadData) => {
  const { imageSlot, originalFileName, mimeType, size, buffer, filePath } = uploadData;

  const tenant = await assertTenantAccess(tenantId, ownerId);

  if (tenant.status !== 'ACTIVE') {
    throw new ApiError(400, 'Can only upload documents for active tenants');
  }

  // Replace the document that already occupies this slot
  const existingDocument = await TenantDocument.findOne({ tenant: tenantId, imageSlot });
  if (existingDocument) {
    await deleteFileFromStorage(existingDocument.storageKey);
    await TenantDocument.findByIdAndDelete(existingDocument._id);
  }

  const storageKey = buildStorageKey(tenantId, imageSlot, originalFileName);
  await writeFileToStorage({ buffer, filePath }, storageKey);

  const document = new TenantDocument({
    tenant: tenantId,
    imageSlot,
    originalFileName,
    mimeType,
    storageKey,
    size,
  });

  await document.save();

  return toDocumentResponse(document);
};

/**
 * Get all documents for a tenant
 */
export const getTenantDocuments = async (tenantId, ownerId) => {
  await assertTenantAccess(tenantId, ownerId);

  const documents = await TenantDocument.find({ tenant: tenantId }).sort({ imageSlot: 1 });
  return documents.map(toDocumentResponse);
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId, ownerId) => {
  const document = await assertDocumentAccess(documentId, ownerId);

  await deleteFileFromStorage(document.storageKey);
  await TenantDocument.findByIdAndDelete(documentId);

  return { message: 'Document deleted successfully' };
};

/**
 * Get view/download URLs for a document
 */
export const getDocumentDownloadUrl = async (documentId, ownerId) => {
  const document = await assertDocumentAccess(documentId, ownerId);
  const response = toDocumentResponse(document);

  return {
    document: response,
    url: response.url,
  };
};

/**
 * Resolve a document to a readable file on disk (used by the file endpoints).
 */
export const getDocumentFile = async (documentId, ownerId) => {
  const document = await assertDocumentAccess(documentId, ownerId);
  return resolveDocumentFile(document);
};

/**
 * Resolve a document from its storage key (legacy /view endpoint).
 */
export const getDocumentFileByStorageKey = async (storageKey, ownerId) => {
  const document = await TenantDocument.findOne({ storageKey });
  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  await assertTenantAccess(document.tenant, ownerId);
  return resolveDocumentFile(document);
};

const resolveDocumentFile = async (document) => {
  assertLocalStorage();

  const filePath = resolveStoragePath(document.storageKey);

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new ApiError(404, 'Document not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(404, 'Document not found');
  }

  return {
    path: filePath,
    mimeType: document.mimeType,
    originalFileName: document.originalFileName,
  };
};

/**
 * Serve document file (kept for backwards compatibility with storage keys).
 */
export const serveDocumentFile = async (storageKey, ownerId) => {
  if (ownerId) {
    return getDocumentFileByStorageKey(storageKey, ownerId);
  }

  assertLocalStorage();
  const filePath = resolveStoragePath(storageKey);

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new ApiError(404, 'Document not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(404, 'Document not found');
  }

  return {
    path: filePath,
    mimeType: storageKey.includes('.png')
      ? 'image/png'
      : storageKey.includes('.jpg') || storageKey.includes('.jpeg')
        ? 'image/jpeg'
        : 'application/octet-stream',
  };
};
