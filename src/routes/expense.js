import { Router } from 'express';
import * as expenseController from '../controllers/expenseController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/expenses', expenseController.getExpenses);
router.post('/expenses', expenseController.createExpense);
router.get('/expenses/:id', expenseController.getExpenseById);
router.put('/expenses/:id', expenseController.updateExpense);
router.delete('/expenses/:id', expenseController.deleteExpense);
router.get('/properties/:propertyId/expenses-summary', expenseController.getExpenseSummary);

export default router;
