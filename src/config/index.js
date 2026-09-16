import dotenv from 'dotenv';
dotenv.config();

const port = parseInt(process.env.PORT, 10) || 3001;

// Base URL of this API. Used to build absolute file URLs that can be used
// directly in <img src> / new-tab navigation by the frontend.
const apiBaseUrl = (process.env.API_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');

export const config = {
  port,
  apiBaseUrl,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/property-management',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    localPath: process.env.LOCAL_STORAGE_PATH || './uploads/documents',
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      bucket: process.env.S3_BUCKET,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      region: process.env.S3_REGION || 'auto',
    },
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/jpg')
      .split(',')
      .map(type => type.trim()),
  },
};
