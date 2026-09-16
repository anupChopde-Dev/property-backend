import multer from 'multer';
import { config } from '../config/index.js';
import { ApiError } from '../utils/errorHandler.js';

/** Max files accepted in one multipart request (tenant documents use 2 slots). */
const MAX_UPLOAD_FILES = 2;

/**
 * Multipart field names accepted for document uploads. Frontends use different
 * names (`photo` on tenant creation forms, `document` on the documents page,
 * ...) so accept all of them instead of failing with "Unexpected field".
 */
export const DOCUMENT_FIELD_NAMES = new Set([
  'photo',
  'photos',
  'image',
  'images',
  'avatar',
  'picture',
  'document',
  'documents',
  'file',
  'files',
]);

// Memory storage: files are either written to local storage or embedded in
// MongoDB by the services, so no temp files are needed.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
    files: MAX_UPLOAD_FILES,
  },
  fileFilter: (req, file, cb) => {
    if (!config.upload.allowedImageTypes.includes(file.mimetype)) {
      return cb(
        new ApiError(
          400,
          `Invalid file type. Allowed: ${config.upload.allowedImageTypes.join(', ')}`
        )
      );
    }
    cb(null, true);
  },
}).any();

const multerErrorMessage = (error) => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return `File is too large. Maximum allowed size is ${Math.round(
        config.upload.maxFileSize / (1024 * 1024)
      )}MB`;
    case 'LIMIT_FILE_COUNT':
      return `Too many files. Maximum is ${MAX_UPLOAD_FILES} per request`;
    case 'LIMIT_UNEXPECTED_FILE':
      return `Unexpected file field "${error.field}". Allowed fields: ${[
        ...DOCUMENT_FIELD_NAMES,
      ].join(', ')}`;
    default:
      return error.message || 'File upload failed';
  }
};

/**
 * Express middleware: parses multipart document uploads into `req.files` and
 * validates the field names. Non-multipart requests pass straight through, so
 * the same route can accept JSON and multipart/form-data.
 */
export const uploadDocuments = (req, res, next) => {
  upload(req, res, (error) => {
    if (error) {
      if (error instanceof ApiError) return next(error);
      return next(new ApiError(400, multerErrorMessage(error)));
    }

    try {
      const files = req.files || [];
      for (const file of files) {
        if (!DOCUMENT_FIELD_NAMES.has(file.fieldname)) {
          throw new ApiError(
            400,
            `Unexpected file field "${file.fieldname}". Allowed fields: ${[
              ...DOCUMENT_FIELD_NAMES,
            ].join(', ')}`
          );
        }
      }
      return next();
    } catch (validationError) {
      return next(validationError);
    }
  });
};
