import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { authService } from '../services/index.js';
import { loginSchema, registerSchema, updateProfileSchema } from '../validators/index.js';

/**
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const validatedData = registerSchema.parse(req.body);

  const result = await authService.registerUser(validatedData);

  sendSuccess(res, {
    user: result.user,
    token: result.token,
  }, 201, 'Registration successful');
});

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);

  const result = await authService.loginUser(validatedData.email, validatedData.password);

  sendSuccess(res, {
    user: result.user,
    token: result.token,
  }, 200, 'Login successful');
});

/**
 * POST /api/auth/logout
 * Note: Since JWT is stateless, logout is handled client-side by removing the token
 */
export const logout = asyncHandler(async (req, res) => {
  sendSuccess(res, null, 200, 'Logout successful');
});

/**
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  sendSuccess(res, user, 200, 'User retrieved');
});

/**
 * PUT /api/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const validatedData = updateProfileSchema.parse(req.body);

  const user = await authService.updateUserProfile(req.user.id, validatedData);

  sendSuccess(res, user, 200, 'Profile updated');
});
