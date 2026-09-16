import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { propertyService } from '../services/index.js';
import { createPropertySchema, updatePropertySchema } from '../validators/index.js';

/**
 * GET /api/properties
 */
export const getProperties = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  const properties = await propertyService.getProperties(req.user.id, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });

  sendSuccess(res, properties, 200, 'Properties retrieved');
});

/**
 * POST /api/properties
 */
export const createProperty = asyncHandler(async (req, res) => {
  const validatedData = createPropertySchema.parse(req.body);

  const property = await propertyService.createProperty(req.user.id, validatedData);

  sendSuccess(res, property, 201, 'Property created');
});

/**
 * GET /api/properties/:id
 */
export const getPropertyById = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyById(req.params.id, req.user.id);

  sendSuccess(res, property, 200, 'Property retrieved');
});

/**
 * PUT /api/properties/:id
 */
export const updateProperty = asyncHandler(async (req, res) => {
  const validatedData = updatePropertySchema.parse(req.body);

  const property = await propertyService.updateProperty(
    req.params.id,
    req.user.id,
    validatedData
  );

  sendSuccess(res, property, 200, 'Property updated');
});

/**
 * DELETE /api/properties/:id
 */
export const deleteProperty = asyncHandler(async (req, res) => {
  await propertyService.deleteProperty(req.params.id, req.user.id);

  sendSuccess(res, null, 200, 'Property deactivated');
});

/**
 * GET /api/properties/:id/dashboard
 */
export const getPropertyDashboard = asyncHandler(async (req, res) => {
  const dashboard = await propertyService.getPropertyDashboard(req.params.id, req.user.id);

  sendSuccess(res, dashboard, 200, 'Property dashboard retrieved');
});
