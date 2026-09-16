import { ApiError } from './errorHandler.js';
import { config } from '../config/index.js';

/**
 * A tenant has exactly one photo. It is stored as a Buffer inside the tenant
 * document in MongoDB (no external storage, no temp files) and is served from
 * GET /api/tenants/:id/photo.
 */

/**
 * Body field names the frontend may use to send the photo. Multipart file field
 * names are validated in the upload middleware with the same list.
 */
export const PHOTO_BODY_KEYS = ['photo', 'image', 'avatar', 'file', 'picture'];

const DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i;
const BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/;

const bytesToMb = (bytes) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

export const normalizeMimeType = (mimeType) => {
  const value = String(mimeType || '').toLowerCase().trim();
  return value === 'image/jpg' ? 'image/jpeg' : value;
};

/**
 * Detect the image type from the file magic bytes. Keeps uploads working when
 * the client sends raw base64 without a mime type.
 */
const sniffImageMimeType = (buffer) => {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  return null;
};

const extensionFor = (mimeType) => (mimeType === 'image/png' ? 'png' : 'jpg');

/**
 * Validate one photo candidate and normalise it.
 */
const acceptPhoto = (candidate) => {
  const buffer = candidate.buffer;
  if (!buffer || !buffer.length) {
    throw new ApiError(400, 'Uploaded photo is empty');
  }

  if (buffer.length > config.upload.maxFileSize) {
    throw new ApiError(
      400,
      `Photo is too large. Maximum allowed size is ${bytesToMb(config.upload.maxFileSize)}MB`
    );
  }

  const mimeType = normalizeMimeType(candidate.mimeType) || sniffImageMimeType(buffer);
  if (!mimeType || !config.upload.allowedImageTypes.includes(mimeType)) {
    throw new ApiError(
      400,
      `Invalid file type. Allowed: ${config.upload.allowedImageTypes.join(', ')}`
    );
  }

  const originalFileName =
    candidate.originalFileName && String(candidate.originalFileName).trim()
      ? String(candidate.originalFileName).trim()
      : `photo.${extensionFor(mimeType)}`;

  return { buffer, mimeType, size: buffer.length, originalFileName };
};

const fromString = (value) => {
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  // data:image/png;base64,....
  const dataUrl = DATA_URL_PATTERN.exec(trimmed);
  if (dataUrl) {
    return { buffer: Buffer.from(dataUrl[2], 'base64'), mimeType: dataUrl[1] };
  }

  // Raw base64 (frontends sometimes send the bare base64 string)
  const compact = trimmed.replace(/\s+/g, '');
  if (compact.length > 64 && BASE64_PATTERN.test(compact)) {
    return { buffer: Buffer.from(compact, 'base64') };
  }

  // Anything else (already-uploaded URL, file path, ...) is ignored
  return null;
};

const fromObject = (value) => {
  const raw = value.data ?? value.base64 ?? value.content ?? value.buffer;
  const originalFileName =
    value.originalFileName ?? value.originalName ?? value.name ?? value.filename ?? value.fileName;
  const mimeType = value.mimeType ?? value.type;

  if (Buffer.isBuffer(raw)) {
    return { buffer: raw, mimeType, originalFileName };
  }

  if (typeof raw === 'string') {
    const parsed = fromString(raw);
    return parsed ? { ...parsed, originalFileName, mimeType: mimeType || parsed.mimeType } : null;
  }

  return null;
};

const normalizeItem = (item) => {
  if (item === null || item === undefined) return null;
  if (typeof item === 'string') return fromString(item);
  if (Buffer.isBuffer(item)) return { buffer: item };
  if (typeof item === 'object') return fromObject(item);
  return null;
};

/**
 * Pull the tenant photo out of a request body (JSON or multipart text fields)
 * and/or multipart files. Extra images are ignored - a tenant has one photo.
 *
 * @returns {{ data: object, photo: {buffer: Buffer, mimeType: string, size: number, originalFileName: string} | null }}
 */
export const extractTenantPhoto = (body = {}, files = []) => {
  const data = { ...body };
  const candidates = [];

  for (const file of files) {
    if (file?.buffer?.length) {
      candidates.push({
        buffer: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
        originalFileName: file.originalname,
      });
    }
  }

  for (const key of PHOTO_BODY_KEYS) {
    if (!(key in data)) continue;

    const value = data[key];
    delete data[key];

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      const photo = normalizeItem(item);
      if (photo) candidates.push(photo);
    }
  }

  return {
    data,
    photo: candidates.length ? acceptPhoto(candidates[0]) : null,
  };
};

/**
 * Build the photo payload embedded in the tenant document.
 */
export const toPhotoPayload = (photo) => {
  if (!photo) return null;
  return {
    data: photo.buffer,
    mimeType: photo.mimeType,
    originalName: photo.originalFileName,
    size: photo.size,
    uploadedAt: new Date(),
  };
};
