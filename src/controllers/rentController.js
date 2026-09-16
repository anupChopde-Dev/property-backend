import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { rentService } from '../services/index.js';
import { createRentChargeSchema, updateRentChargeSchema, createRentPaymentSchema } from '../validators/index.js';

/**
 * GET /api/rent-charges
 */
export const getRentCharges = asyncHandler(async (req, res) => {
  const { status, billingMonth, propertyId, roomId } = req.query;

  const charges = await rentService.getRentCharges(req.user.id, {
    status,
    billingMonth,
    propertyId,
    roomId,
  });

  sendSuccess(res, charges, 200, 'Rent charges retrieved');
});

/**
 * POST /api/rent-charges
 */
export const createRentCharge = asyncHandler(async (req, res) => {
  const validatedData = createRentChargeSchema.parse(req.body);

  const charge = await rentService.createRentCharge(req.user.id, validatedData);

  sendSuccess(res, charge, 201, 'Rent charge created');
});

/**
 * GET /api/rent-charges/:id
 */
export const getRentChargeById = asyncHandler(async (req, res) => {
  const charge = await rentService.getRentChargeById(req.params.id, req.user.id);

  sendSuccess(res, charge, 200, 'Rent charge retrieved');
});

/**
 * PUT /api/rent-charges/:id
 */
export const updateRentCharge = asyncHandler(async (req, res) => {
  const validatedData = updateRentChargeSchema.parse(req.body);

  const charge = await rentService.updateRentCharge(
    req.params.id,
    req.user.id,
    validatedData
  );

  sendSuccess(res, charge, 200, 'Rent charge updated');
});

/**
 * DELETE /api/rent-charges/:id
 */
export const deleteRentCharge = asyncHandler(async (req, res) => {
  await rentService.deleteRentCharge(req.params.id, req.user.id);

  sendSuccess(res, null, 200, 'Rent charge deleted');
});

/**
 * POST /api/rent-charges/:id/payments
 */
export const addPayment = asyncHandler(async (req, res) => {
  const validatedData = createRentPaymentSchema.parse(req.body);

  const payment = await rentService.addPayment(
    req.params.id,
    req.user.id,
    validatedData
  );

  sendSuccess(res, payment, 201, 'Payment added');
});

/**
 * GET /api/rent-charges/:id/payments
 */
export const getChargePayments = asyncHandler(async (req, res) => {
  const payments = await rentService.getChargePayments(
    req.params.id,
    req.user.id
  );

  sendSuccess(res, payments, 200, 'Payments retrieved');
});

/**
 * GET /api/tenants/:tenantId/rent-history
 */
export const getTenantRentHistory = asyncHandler(async (req, res) => {
  const history = await rentService.getTenantRentHistory(
    req.params.tenantId,
    req.user.id
  );

  sendSuccess(res, history, 200, 'Rent history retrieved');
});
