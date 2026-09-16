import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { expenseService } from '../services/index.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/index.js';

/**
 * GET /api/expenses
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const { propertyId, roomId, category, fromDate, toDate } = req.query;

  const expenses = await expenseService.getExpenses(req.user.id, {
    propertyId,
    roomId,
    category,
    fromDate,
    toDate,
  });

  sendSuccess(res, expenses, 200, 'Expenses retrieved');
});

/**
 * POST /api/expenses
 */
export const createExpense = asyncHandler(async (req, res) => {
  const validatedData = createExpenseSchema.parse(req.body);

  const expense = await expenseService.createExpense(req.user.id, validatedData);

  sendSuccess(res, expense, 201, 'Expense created');
});

/**
 * GET /api/expenses/:id
 */
export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.params.id, req.user.id);

  sendSuccess(res, expense, 200, 'Expense retrieved');
});

/**
 * PUT /api/expenses/:id
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const validatedData = updateExpenseSchema.parse(req.body);

  const expense = await expenseService.updateExpense(
    req.params.id,
    req.user.id,
    validatedData
  );

  sendSuccess(res, expense, 200, 'Expense updated');
});

/**
 * DELETE /api/expenses/:id
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.params.id, req.user.id);

  sendSuccess(res, null, 200, 'Expense deleted');
});

/**
 * GET /api/properties/:propertyId/expenses-summary
 */
export const getExpenseSummary = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;
  const { fromMonth, toMonth } = req.query;

  const summary = await expenseService.getExpenseSummary(
    req.user.id,
    propertyId,
    fromMonth,
    toMonth
  );

  sendSuccess(res, summary, 200, 'Expense summary retrieved');
});
