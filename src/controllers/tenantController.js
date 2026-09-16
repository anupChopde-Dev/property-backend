import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { tenantService } from '../services/index.js';
import { createTenantSchema, updateTenantSchema } from '../validators/index.js';
import { Tenant, Room, Property } from '../models/index.js';
import { extractTenantPhoto, toPhotoPayload } from '../utils/tenantPhoto.js';

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
 * - multipart/form-data: optional single photo ("photo", "image", ...)
 * - application/json: the photo may also be sent as a base64 data URL
 *
 * The photo is stored as a Buffer inside the tenant document in MongoDB.
 */
export const createTenant = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.leavingDate === '') delete body.leavingDate;

  const { data, photo } = extractTenantPhoto(body, req.files);

  const validatedData = createTenantSchema.parse(data);
  const tenant = await tenantService.createTenant(
    req.user.id,
    validatedData,
    toPhotoPayload(photo)
  );

  sendSuccess(res, tenant, 201, 'Tenant created');
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
 * Accepts JSON or multipart/form-data (multipart can replace the tenant photo).
 */
export const updateTenant = asyncHandler(async (req, res) => {
  const { data, photo } = extractTenantPhoto({ ...req.body }, req.files);

  const validatedData = updateTenantSchema.parse(data);
  const tenant = await tenantService.updateTenant(
    req.params.id,
    req.user.id,
    validatedData,
    toPhotoPayload(photo)
  );
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
