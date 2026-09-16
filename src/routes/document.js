import { Router } from 'express';
import * as documentController from '../controllers/documentController.js';
import { authenticate } from '../middlewares/auth.js';
import { uploadDocuments } from '../middlewares/upload.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/tenants/:tenantId/documents', uploadDocuments, documentController.uploadDocument);
router.get('/tenants/:tenantId/documents', documentController.getTenantDocuments);
router.delete('/documents/:id', documentController.deleteDocument);
router.get('/documents/:id/download', documentController.getDocumentDownload);

// File endpoints (use document id so the URL stays clean and safe)
router.get('/documents/:id/file', documentController.getDocumentFile);

// File serving endpoint (for local storage, legacy storage-key based)
router.get('/documents/:storageKey/view', documentController.viewDocument);

export default router;
