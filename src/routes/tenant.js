import { Router } from 'express';
import * as tenantController from '../controllers/tenantController.js';
import { authenticate } from '../middlewares/auth.js';
import { uploadDocuments } from '../middlewares/upload.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', tenantController.getTenants);
// Accepts JSON or multipart/form-data with optional documents (image slots)
router.post('/', uploadDocuments, tenantController.createTenant);
router.get('/:id/photo', tenantController.getTenantPhoto);
router.get('/:id', tenantController.getTenantById);
// Accepts JSON or multipart/form-data (multipart can replace the tenant photo)
router.put('/:id', uploadDocuments, tenantController.updateTenant);
router.post('/:id/move-out', tenantController.moveOutTenant);
router.get('/:id/members', tenantController.getTenantMembers);
router.post('/:id/members', tenantController.addTenantMember);

// Nested routes for member management
router.put('/members/:id', tenantController.updateTenantMember);
router.delete('/members/:id', tenantController.removeTenantMember);

export default router;
