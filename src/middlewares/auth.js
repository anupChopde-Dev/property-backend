import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { ApiError } from '../utils/errorHandler.js';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    // Fallback: ?token= query param for endpoints that cannot set headers
    // (e.g. <img src> tags loading tenant photos)
    let authHeader = req.headers.authorization;
    if (!authHeader && req.query?.token) {
      authHeader = `Bearer ${req.query.token}`;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Attach user to request (excluding password)
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    // Ignore authentication errors for optional auth
  }

  next();
};
