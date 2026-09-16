import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { electricityService } from '../services/index.js';
import { createElectricityReadingSchema, updateElectricityReadingSchema } from '../validators/index.js';

/**
 * GET /api/electricity
 */
export const getElectricityReadings = asyncHandler(async (req, res) => {
  const { billingMonth, propertyId, roomId } = req.query;

  const readings = await electricityService.getElectricityReadings(req.user.id, {
    billingMonth,
    propertyId,
    roomId,
  });

  sendSuccess(res, readings, 200, 'Electricity readings retrieved');
});

/**
 * POST /api/electricity/readings
 */
export const createElectricityReading = asyncHandler(async (req, res) => {
  const validatedData = createElectricityReadingSchema.parse(req.body);

  const reading = await electricityService.createElectricityReading(
    req.user.id,
    validatedData
  );

  sendSuccess(res, reading, 201, 'Electricity reading created');
});

/**
 * GET /api/electricity/readings/:id
 */
export const getElectricityReadingById = asyncHandler(async (req, res) => {
  const reading = await electricityService.getElectricityReadingById(
    req.params.id,
    req.user.id
  );

  sendSuccess(res, reading, 200, 'Electricity reading retrieved');
});

/**
 * PUT /api/electricity/readings/:id
 */
export const updateElectricityReading = asyncHandler(async (req, res) => {
  const validatedData = updateElectricityReadingSchema.parse(req.body);

  const reading = await electricityService.updateElectricityReading(
    req.params.id,
    req.user.id,
    validatedData
  );

  sendSuccess(res, reading, 200, 'Electricity reading updated');
});

/**
 * DELETE /api/electricity/readings/:id
 */
export const deleteElectricityReading = asyncHandler(async (req, res) => {
  await electricityService.deleteElectricityReading(req.params.id, req.user.id);

  sendSuccess(res, null, 200, 'Electricity reading deleted');
});

/**
 * GET /api/rooms/:roomId/electricity
 */
export const getRoomElectricity = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const electricityData = await electricityService.getRoomElectricityHistory(
    roomId,
    req.user.id
  );

  sendSuccess(res, electricityData, 200, 'Room electricity history retrieved');
});

/**
 * GET /api/electricity/previous-reading/:roomId/:billingMonth
 */
export const getPreviousReading = asyncHandler(async (req, res) => {
  const { roomId, billingMonth } = req.params;

  const previousReading = await electricityService.getPreviousReading(
    roomId,
    billingMonth
  );

  sendSuccess(res, { previousReading }, 200, 'Previous reading retrieved');
});
