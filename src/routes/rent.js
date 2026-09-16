import { Router } from 'express';
import * as rentController from '../controllers/rentController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/rent-charges', rentController.getRentCharges);
router.post('/rent-charges', rentController.createRentCharge);
router.get('/rent-charges/:id', rentController.getRentChargeById);
router.put('/rent-charges/:id', rentController.updateRentCharge);
router.delete('/rent-charges/:id', rentController.deleteRentCharge);
router.post('/rent-charges/:id/payments', rentController.addPayment);
router.get('/rent-charges/:id/payments', rentController.getChargePayments);
router.get('/tenants/:tenantId/rent-history', rentController.getTenantRentHistory);

export default router;
