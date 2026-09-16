import { errorHandler, notFoundHandler } from '../utils/errorHandler.js';
import { config } from '../config/index.js';

/**
 * Global error handler middleware
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
  errorHandler(err, req, res, next);
};

/**
 * 404 Not Found handler
 */
export const notFoundMiddleware = (req, res, next) => {
  notFoundHandler(req, res, next);
};

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * Request logging middleware (development only)
 */
export const requestLogger = (req, res, next) => {
  if (config.nodeEnv === 'development') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
};