import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/reports/monthly', reportController.getMonthlyReport);
router.get('/reports/rent', reportController.getRentReport);
router.get('/reports/outstanding-rent', reportController.getOutstandingRentReport);
router.get('/reports/electricity', reportController.getElectricityReport);
router.get('/reports/expenses', reportController.getExpenseReport);

export default router;
