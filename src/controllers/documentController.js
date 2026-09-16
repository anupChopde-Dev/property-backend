import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { documentService } from '../services/index.js';
import { uploadDocumentSchema } from '../validators/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = path.resolve('./uploads/temp');
    await fs.mkdir(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!config.upload.allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed: ${config.upload.allowedImageTypes.join(', ')}`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter,
}).single('document');

/**
 * POST /api/tenants/:tenantId/documents
 */
export const uploadDocument = asyncHandler(async (req, res, next) => {
  // Handle file upload with multer
  upload(req, res, async (err) => {
    if (err) {
      return next(new Error(err.message || 'File upload failed'));
    }

    if (!req.file) {
      return next(new Error('No file provided'));
    }

    // Validate request body
    const validatedData = uploadDocumentSchema.parse({
      imageSlot: parseInt(req.body.imageSlot, 10),
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    const document = await documentService.uploadDocument(
      req.params.tenantId,
      req.user.id,
      {
        ...validatedData,
        filePath: req.file.path,
      }
    );

    sendSuccess(res, document, 201, 'Document uploaded');
  });
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
export const getDocumentDownload = asyncHandler(async (req, res, next) => {
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
 * GET /api/documents/:storageKey/view
 * Serve document file directly (for local storage)
 */
export const viewDocument = asyncHandler(async (req, res, next) => {
  try {
    // Decode the storage key from URL
    const storageKey = decodeURIComponent(req.params.storageKey);

    const fileInfo = await documentService.serveDocumentFile(storageKey);

    // Determine content type
    const ext = path.extname(storageKey).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(storageKey)}"`);

    const fileStream = require('fs').createReadStream(fileInfo.path);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});
