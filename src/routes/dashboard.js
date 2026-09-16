import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/dashboard', dashboardController.getDashboard);
router.get('/properties/:id/dashboard', dashboardController.getPropertyDashboard);

export default router;
