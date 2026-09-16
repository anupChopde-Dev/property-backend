import { User } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';
import { config } from '../config/index.js';
import jwt from 'jsonwebtoken';

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
  const { email, password, fullName, mobile } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  // Create new user (password will be hashed by pre-save hook)
  const user = new User({
    email,
    password,
    fullName,
    mobile,
  });

  await user.save();

  // Generate JWT token
  const token = generateToken(user._id, user.email);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Login user and return token
 */
export const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'Account is deactivated');
  }

  const token = generateToken(user._id, user.email);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Get current user
 */
export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user.toJSON();
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (updateData.password) {
    user.password = updateData.password;
  }

  if (updateData.fullName !== undefined) {
    user.fullName = updateData.fullName;
  }

  if (updateData.mobile !== undefined) {
    user.mobile = updateData.mobile;
  }

  await user.save();

  return user.toJSON();
};

/**
 * Generate JWT token
 */
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};
