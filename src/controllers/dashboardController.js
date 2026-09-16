import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { dashboardService } from '../services/index.js';

/**
 * GET /api/dashboard
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await dashboardService.getDashboardData(req.user.id);

  sendSuccess(res, dashboard, 200, 'Dashboard retrieved');
});

/**
 * GET /api/properties/:id/dashboard
 */
export const getPropertyDashboard = asyncHandler(async (req, res) => {
  const dashboard = await dashboardService.getPropertyDashboardData(
    req.params.id,
    req.user.id
  );

  sendSuccess(res, dashboard, 200, 'Property dashboard retrieved');
});
