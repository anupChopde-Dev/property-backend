import multer from 'multer';
import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { tenantService } from '../services/index.js';
import { createTenantSchema, updateTenantSchema } from '../validators/index.js';
import { Tenant, Room, Property } from '../models/index.js';
import { config } from '../config/index.js';

/* ---------------- Multer (memory storage -> Buffer stored in MongoDB) ---------------- */

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (!config.upload.allowedImageTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed: ${config.upload.allowedImageTypes.join(', ')}`));
    }
    cb(null, true);
  },
}).single('photo');

/**
 * GET /api/tenants
 */
export const getTenants = asyncHandler(async (req, res) => {
  const { status, propertyId, search } = req.query;

  const tenants = await tenantService.getTenants(req.user.id, {
    status,
    propertyId,
    search,
  });

  sendSuccess(res, tenants, 200, 'Tenants retrieved');
});

/**
 * POST /api/tenants
 * - multipart/form-data: optional "photo" file stored as Buffer in MongoDB
 * - application/json: no photo
 */
export const createTenant = asyncHandler(async (req, res) => {
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    const validatedData = createTenantSchema.parse(req.body);
    const tenant = await tenantService.createTenant(req.user.id, validatedData);
    return sendSuccess(res, tenant, 201, 'Tenant created');
  }

  // Multipart with optional photo
  photoUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }

    try {
      const body = { ...req.body };
      if (body.leavingDate === '') delete body.leavingDate;

      let photoPayload;
      if (req.file) {
        photoPayload = {
          data: req.file.buffer,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          size: req.file.size,
          uploadedAt: new Date(),
        };
      }

      const validatedData = createTenantSchema.parse(body);
      const tenant = await tenantService.createTenant(req.user.id, validatedData, photoPayload);
      return sendSuccess(res, tenant, 201, 'Tenant created');
    } catch (e) {
      const statusCode = e.statusCode || (e.name === 'ZodError' ? 400 : 500);
      const message = e.name === 'ZodError' ? e.issues?.[0]?.message : e.message;
      return res.status(statusCode).json({ success: false, message });
    }
  });
});

/**
 * GET /api/tenants/:id/photo
 * Serves the tenant photo directly from the Buffer stored in MongoDB
 */
export const getTenantPhoto = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id).select('photo room');
  if (!tenant || !tenant.photo?.data) {
    return res.status(404).json({ success: false, message: 'Photo not found' });
  }

  // Ownership check via room -> property -> owner
  const room = await Room.findById(tenant.room);
  const property = room ? await Property.findById(room.property) : null;
  if (!property || property.owner.toString() !== req.user.id) {
    return res.status(404).json({ success: false, message: 'Photo not found' });
  }

  res.setHeader('Content-Type', tenant.photo.mimeType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.send(tenant.photo.data);
});

/**
 * GET /api/tenants/:id
 */
export const getTenantById = asyncHandler(async (req, res) => {
  const tenant = await tenantService.getTenantById(req.params.id, req.user.id);
  sendSuccess(res, tenant, 200, 'Tenant retrieved');
});

/**
 * PUT /api/tenants/:id
 */
export const updateTenant = asyncHandler(async (req, res) => {
  const validatedData = updateTenantSchema.parse(req.body);
  const tenant = await tenantService.updateTenant(req.params.id, req.user.id, validatedData);
  sendSuccess(res, tenant, 200, 'Tenant updated');
});

/**
 * POST /api/tenants/:id/move-out
 */
export const moveOutTenant = asyncHandler(async (req, res) => {
  const tenant = await tenantService.moveOutTenant(req.params.id, req.user.id);
  sendSuccess(res, tenant, 200, 'Tenant moved out');
});

/**
 * GET /api/tenants/:id/members
 */
export const getTenantMembers = asyncHandler(async (req, res) => {
  const members = await tenantService.getTenantMembers(req.params.id, req.user.id);
  sendSuccess(res, members, 200, 'Members retrieved');
});

/**
 * POST /api/tenants/:id/members
 */
export const addTenantMember = asyncHandler(async (req, res) => {
  const { createTenantMemberSchema } = await import('../validators/tenantMember.js');
  const validatedData = createTenantMemberSchema.parse(req.body);
  const member = await tenantService.addTenantMember(req.params.id, req.user.id, validatedData);
  sendSuccess(res, member, 201, 'Member added');
});

/**
 * PUT /api/tenant-members/:id
 */
export const updateTenantMember = asyncHandler(async (req, res) => {
  const { updateTenantMemberSchema } = await import('../validators/tenantMember.js');
  const validatedData = updateTenantMemberSchema.parse(req.body);
  const member = await tenantService.updateTenantMember(req.params.id, req.user.id, validatedData);
  sendSuccess(res, member, 200, 'Member updated');
});

/**
 * DELETE /api/tenant-members/:id
 */
export const removeTenantMember = asyncHandler(async (req, res) => {
  await tenantService.removeTenantMember(req.params.id, req.user.id);
  sendSuccess(res, null, 200, 'Member removed');
});
