import { Room, Property, Tenant, TenantMember, RentCharge, RentPayment, ElectricityReading, Expense } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';
import { buildTenantResponse } from './tenantService.js';

/**
 * Get all rooms across all owner's properties (with property + tenant info)
 */
export const getAllRooms = async (ownerId) => {
  const properties = await Property.find({ owner: ownerId, isActive: true });
  const propertyIds = properties.map(p => p._id);

  const rooms = await Room.find({ property: { $in: propertyIds } })
    .sort({ roomNumber: 1 })
    .lean();

  const roomIds = rooms.map(r => r._id);
  const activeTenants = await Tenant.find({ room: { $in: roomIds }, status: 'ACTIVE' })
    .select('room fullName mobile')
    .lean();

  const tenantByRoom = {};
  activeTenants.forEach(t => {
    tenantByRoom[t.room.toString()] = { fullName: t.fullName, mobile: t.mobile || null };
  });

  return rooms.map(room => {
    const tenant = tenantByRoom[room._id.toString()] || null;
    return {
      ...room,
      propertyId: room.property,
      propertyName: properties.find(p => p._id.toString() === room.property.toString())?.name || null,
      tenantName: tenant ? tenant.fullName : null,
      tenantPhone: tenant ? tenant.mobile : null,
      occupied: room.status === 'OCCUPIED',
    };
  });
};

/**
 * Create a room
 */
export const createRoom = async (propertyId, ownerId, roomData) => {
  // Verify property ownership
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  const room = new Room({
    ...roomData,
    property: propertyId,
  });

  await room.save();
  return room.toJSON();
};

/**
 * Get rooms for a property (with current tenant info)
 */
export const getPropertyRooms = async (propertyId, ownerId) => {
  // Verify property ownership
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  const rooms = await Room.find({ property: propertyId }).sort({ roomNumber: 1 }).lean();

  const roomIds = rooms.map(r => r._id);
  const activeTenants = await Tenant.find({ room: { $in: roomIds }, status: 'ACTIVE' })
    .select('room fullName mobile')
    .lean();

  const tenantByRoom = {};
  activeTenants.forEach(t => {
    tenantByRoom[t.room.toString()] = { fullName: t.fullName, mobile: t.mobile || null };
  });

  return rooms.map(room => {
    const tenant = tenantByRoom[room._id.toString()] || null;
    return {
      ...room,
      propertyId: room.property,
      propertyName: property.name,
      tenantName: tenant ? tenant.fullName : null,
      tenantPhone: tenant ? tenant.mobile : null,
      occupied: room.status === 'OCCUPIED',
    };
  });
};

/**
 * Get room by ID
 */
export const getRoomById = async (roomId, ownerId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  // Verify ownership through property
  const property = await Property.findOne({ _id: room.property, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Room not found');
  }

  // Populate current tenant info (with photo thumbnail)
  const currentTenant = await Tenant.findOne({ room: room._id, status: 'ACTIVE' });

  return {
    room: room.toJSON(),
    currentTenant: buildTenantResponse(currentTenant),
  };
};

/**
 * Update room
 */
export const updateRoom = async (roomId, ownerId, updateData) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  // Verify ownership through property
  const property = await Property.findOne({ _id: room.property, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Room not found');
  }

  Object.assign(room, updateData);
  await room.save();

  return room.toJSON();
};

/**
 * Get room dashboard data
 */
export const getRoomDashboard = async (roomId, ownerId, billingMonth = null) => {
  const { room, currentTenant } = await getRoomById(roomId, ownerId);

  if (!billingMonth) {
    const now = new Date();
    billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Get household members
  const members = currentTenant
    ? await TenantMember.find({ tenant: currentTenant._id, isActive: true })
    : [];

  // Get current month rent charge
  const rentCharge = await RentCharge.findOne({
    room: room._id,
    billingMonth,
  });

  let rentStatus = null;
  let totalPaid = 0;
  let outstanding = 0;

  if (rentCharge) {
    const payments = await RentPayment.find({ rentCharge: rentCharge._id }).sort({ paymentDate: -1 });
    totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    outstanding = Math.max(0, rentCharge.rentAmount - totalPaid);
    rentStatus = outstanding === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING';
  }

  // Get current month electricity reading
  const electricityReading = await ElectricityReading.findOne({
    room: room._id,
    billingMonth,
  });

  // Get tenant history (with photo thumbnail info)
  const history = await Tenant.find({ room: room._id }).sort({ joiningDate: -1 });
  const historyWithPhoto = history.map(buildTenantResponse);

  // Get room expenses
  const expenses = await Expense.find({ room: room._id }).sort({ date: -1 }).limit(10);

  return {
    room,
    currentTenant,
    members,
    currentMonth: billingMonth,
    rent: {
      charge: rentCharge,
      status: rentStatus,
      totalPaid,
      outstanding,
      payments: rentCharge ? await RentPayment.find({ rentCharge: rentCharge._id }).sort({ paymentDate: -1 }) : [],
    },
    electricity: electricityReading ? electricityReading.toJSON() : null,
    history: historyWithPhoto,
    expenses,
  };
};

/**
 * Delete a room (only when no active tenant and no rent/electricity records)
 */
export const deleteRoom = async (roomId, ownerId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  // Verify ownership through property
  const property = await Property.findOne({ _id: room.property, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Room not found');
  }

  const activeTenant = await Tenant.findOne({ room: room._id, status: 'ACTIVE' });
  if (activeTenant) {
    throw new ApiError(400, 'Cannot delete a room with an active tenant. Move out the tenant first.');
  }

  const rentCharge = await RentCharge.findOne({ room: room._id });
  if (rentCharge) {
    throw new ApiError(400, 'Cannot delete a room with rent records. Delete its rent records first.');
  }

  const reading = await ElectricityReading.findOne({ room: room._id });
  if (reading) {
    throw new ApiError(400, 'Cannot delete a room with electricity records. Delete its electricity records first.');
  }

  await Expense.deleteMany({ room: room._id });
  await Tenant.updateMany({ room: room._id }, { $set: { status: 'MOVED_OUT', leavingDate: new Date() } });
  await Room.findByIdAndDelete(roomId);

  return { message: 'Room deleted successfully' };
};

/**
 * Get room electricity history
 */
export const getRoomElectricity = async (roomId, ownerId) => {
  const { room } = await getRoomById(roomId, ownerId);

  const readings = await ElectricityReading.find({ room: room._id })
    .sort({ billingMonth: -1 });

  return {
    room,
    readings: readings.map(r => r.toJSON()),
  };
};

/**
 * Get room stats for dashboard
 */
export const getRoomStats = async (roomId, ownerId) => {
  const { room } = await getRoomById(roomId, ownerId);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Current month rent
  const rentCharge = await RentCharge.findOne({
    room: room._id,
    billingMonth: currentMonth,
  });

  let totalPaid = 0;
  if (rentCharge) {
    const payments = await RentPayment.find({ rentCharge: rentCharge._id });
    totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  }

  // Current month electricity
  const electricityReading = await ElectricityReading.findOne({
    room: room._id,
    billingMonth: currentMonth,
  });

  return {
    room,
    currentMonthRent: rentCharge ? rentCharge.rentAmount : 0,
    currentMonthPaid: totalPaid,
    currentMonthStatus: rentCharge ? (
      totalPaid >= rentCharge.rentAmount ? 'PAID' :
      totalPaid > 0 ? 'PARTIAL' : 'PENDING'
    ) : null,
    currentMonthElectricity: electricityReading ? electricityReading.toJSON() : null,
  };
};
