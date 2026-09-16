import { Router } from 'express';
import * as roomController from '../controllers/roomController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/rooms', roomController.getAllRooms);
router.get('/properties/:propertyId/rooms', roomController.getPropertyRooms);
router.post('/properties/:propertyId/rooms', roomController.createRoom);
router.get('/rooms/:id', roomController.getRoomById);
router.put('/rooms/:id', roomController.updateRoom);
router.delete('/rooms/:id', roomController.deleteRoom);
router.get('/rooms/:roomId/electricity', roomController.getRoomElectricity);
router.get('/rooms/:roomId/dashboard', roomController.getRoomDashboard);

export default router;
