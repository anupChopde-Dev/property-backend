import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { roomService } from '../services/index.js';
import { createRoomSchema, updateRoomSchema } from '../validators/index.js';

/**
 * GET /api/rooms
 */
export const getAllRooms = asyncHandler(async (req, res) => {
  const rooms = await roomService.getAllRooms(req.user.id);

  sendSuccess(res, rooms, 200, 'Rooms retrieved');
});

/**
 * GET /api/properties/:propertyId/rooms
 */
export const getPropertyRooms = asyncHandler(async (req, res) => {
  const rooms = await roomService.getPropertyRooms(
    req.params.propertyId,
    req.user.id
  );

  sendSuccess(res, rooms, 200, 'Rooms retrieved');
});

/**
 * POST /api/properties/:propertyId/rooms
 */
export const createRoom = asyncHandler(async (req, res) => {
  const validatedData = createRoomSchema.parse(req.body);

  const room = await roomService.createRoom(
    req.params.propertyId,
    req.user.id,
    validatedData
  );

  sendSuccess(res, room, 201, 'Room created');
});

/**
 * GET /api/rooms/:id
 */
export const getRoomById = asyncHandler(async (req, res) => {
  const roomData = await roomService.getRoomById(req.params.id, req.user.id);

  sendSuccess(res, roomData, 200, 'Room retrieved');
});

/**
 * PUT /api/rooms/:id
 */
export const updateRoom = asyncHandler(async (req, res) => {
  const validatedData = updateRoomSchema.parse(req.body);

  const room = await roomService.updateRoom(
    req.params.id,
    req.user.id,
    validatedData
  );

  sendSuccess(res, room, 200, 'Room updated');
});

/**
 * DELETE /api/rooms/:id
 */
export const deleteRoom = asyncHandler(async (req, res) => {
  await roomService.deleteRoom(req.params.id, req.user.id);

  sendSuccess(res, null, 200, 'Room deleted');
});

/**
 * GET /api/rooms/:roomId/electricity
 */
export const getRoomElectricity = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const electricityData = await roomService.getRoomElectricity(roomId, req.user.id);

  sendSuccess(res, electricityData, 200, 'Room electricity history retrieved');
});

/**
 * GET /api/rooms/:roomId/dashboard
 */
export const getRoomDashboard = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { billingMonth } = req.query;

  const dashboard = await roomService.getRoomDashboard(
    roomId,
    req.user.id,
    billingMonth
  );

  sendSuccess(res, dashboard, 200, 'Room dashboard retrieved');
});
