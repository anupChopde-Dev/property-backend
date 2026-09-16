import { asyncHandler, ApiError } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { documentService } from '../services/index.js';
import { uploadDocumentSchema } from '../validators/index.js';
import { normalizeMimeType } from '../utils/tenantPhoto.js';
import { createReadStream } from 'fs';
import path from 'path';

/**
 * POST /api/tenants/:tenantId/documents
 * multipart/form-data with a file field ("document", "photo", ...) and imageSlot
 */
export const uploadDocument = asyncHandler(async (req, res) => {
  const file = (req.files || [])[0];

  if (!file) {
    throw new ApiError(400, 'No file provided');
  }

  const validatedData = uploadDocumentSchema.parse({
    imageSlot: parseInt(req.body.imageSlot ?? req.body.slot ?? 1, 10),
    originalFileName: file.originalname,
    mimeType: normalizeMimeType(file.mimetype),
    size: file.size,
  });

  const document = await documentService.uploadDocument(req.params.tenantId, req.user.id, {
    ...validatedData,
    buffer: file.buffer,
  });

  sendSuccess(res, document, 201, 'Document uploaded');
});

/**
 * GET /api/tenants/:tenantId/documents
 */
export const getTenantDocuments = asyncHandler(async (req, res) => {
  const documents = await documentService.getTenantDocuments(
    req.params.tenantId,
    req.user.id
  );

  sendSuccess(res, documents, 200, 'Documents retrieved');
});

/**
 * DELETE /api/documents/:id
 */
export const deleteDocument = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(req.params.id, req.user.id);

  sendSuccess(res, null, 200, 'Document deleted');
});

/**
 * GET /api/documents/:id/download
 */
export const getDocumentDownload = asyncHandler(async (req, res) => {
  const result = await documentService.getDocumentDownloadUrl(
    req.params.id,
    req.user.id
  );

  sendSuccess(res, {
    document: result.document,
    url: result.url,
  }, 200, 'Download URL retrieved');
});

/**
 * GET /api/documents/:id/file
 * Streams the document inline so it can be used as a thumbnail (<img src>)
 * or opened in a new tab. Add ?download=1 to force a download.
 */
export const getDocumentFile = asyncHandler(async (req, res) => {
  const file = await documentService.getDocumentFile(req.params.id, req.user.id);
  streamDocument(req, res, file);
});

/**
 * GET /api/documents/:storageKey/view
 * Legacy endpoint that serves a document by its storage key.
 */
export const viewDocument = asyncHandler(async (req, res) => {
  // Express already decodes route params, so use the value as-is
  const file = await documentService.serveDocumentFile(req.params.storageKey, req.user.id);
  streamDocument(req, res, file);
});

const streamDocument = (req, res, { path: filePath, mimeType, originalFileName }) => {
  const fileName = originalFileName ? path.basename(originalFileName) : path.basename(filePath);
  const disposition = req.query.download === '1' || req.query.download === 'true'
    ? 'attachment'
    : 'inline';

  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'private, max-age=86400');

  const fileStream = createReadStream(filePath);
  fileStream.on('error', () => {
    if (!res.headersSent) {
      res.status(404).json({ success: false, message: 'Document not found' });
    } else {
      res.end();
    }
  });

  fileStream.pipe(res);
};
