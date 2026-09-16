import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { reportService } from '../services/index.js';

/**
 * GET /api/reports/monthly
 */
export const getMonthlyReport = asyncHandler(async (req, res) => {
  const { month, propertyId } = req.query;

  if (!month) {
    // Default to current month
    const now = new Date();
    req.query.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const report = await reportService.getMonthlyReport(
    req.user.id,
    req.query.month,
    propertyId || null
  );

  sendSuccess(res, report, 200, 'Monthly report retrieved');
});

/**
 * GET /api/reports/rent
 */
export const getRentReport = asyncHandler(async (req, res) => {
  const { propertyId, status } = req.query;

  const report = await reportService.getRentReport(
    req.user.id,
    propertyId || null,
    status || null
  );

  sendSuccess(res, report, 200, 'Rent report retrieved');
});

/**
 * GET /api/reports/outstanding-rent
 */
export const getOutstandingRentReport = asyncHandler(async (req, res) => {
  const { propertyId } = req.query;

  const report = await reportService.getOutstandingRentReport(
    req.user.id,
    propertyId || null
  );

  sendSuccess(res, report, 200, 'Outstanding rent report retrieved');
});

/**
 * GET /api/reports/electricity
 */
export const getElectricityReport = asyncHandler(async (req, res) => {
  const { propertyId, fromMonth, toMonth } = req.query;

  const report = await reportService.getElectricityReport(
    req.user.id,
    propertyId || null,
    fromMonth || null,
    toMonth || null
  );

  sendSuccess(res, report, 200, 'Electricity report retrieved');
});

/**
 * GET /api/reports/expenses
 */
export const getExpenseReport = asyncHandler(async (req, res) => {
  const { propertyId, fromDate, toDate } = req.query;

  const report = await reportService.getExpenseReport(
    req.user.id,
    propertyId || null,
    fromDate || null,
    toDate || null
  );

  sendSuccess(res, report, 200, 'Expense report retrieved');
});
