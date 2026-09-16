import { Router } from 'express';
import * as propertyController from '../controllers/propertyController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', propertyController.getProperties);
router.post('/', propertyController.createProperty);
router.get('/:id', propertyController.getPropertyById);
router.put('/:id', propertyController.updateProperty);
router.delete('/:id', propertyController.deleteProperty);
router.get('/:id/dashboard', propertyController.getPropertyDashboard);

export default router;
