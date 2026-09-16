import { Router } from 'express';
import * as documentController from '../controllers/documentController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/tenants/:tenantId/documents', documentController.uploadDocument);
router.get('/tenants/:tenantId/documents', documentController.getTenantDocuments);
router.delete('/documents/:id', documentController.deleteDocument);
router.get('/documents/:id/download', documentController.getDocumentDownload);

// File serving endpoint (for local storage)
router.get('/documents/:storageKey/view', documentController.viewDocument);

export default router;
