import { Router } from 'express';
import * as electricityController from '../controllers/electricityController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/electricity', electricityController.getElectricityReadings);
router.post('/electricity/readings', electricityController.createElectricityReading);
router.get('/electricity/readings/:id', electricityController.getElectricityReadingById);
router.put('/electricity/readings/:id', electricityController.updateElectricityReading);
router.delete('/electricity/readings/:id', electricityController.deleteElectricityReading);
router.get('/rooms/:roomId/electricity', electricityController.getRoomElectricity);
router.get('/electricity/previous-reading/:roomId/:billingMonth', electricityController.getPreviousReading);

export default router;
