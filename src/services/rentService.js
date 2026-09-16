import { RentCharge, RentPayment, Room, Tenant, Property } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';
import { calculateOutstanding, calculateRentStatus } from '../utils/helpers.js';

/**
 * Create a rent charge for a month
 */
export const createRentCharge = async (ownerId, rentData) => {
  const { room, tenant, billingMonth, rentAmount, dueDate, notes } = rentData;

  // Verify room ownership
  const roomDoc = await Room.findById(room);
  if (!roomDoc) {
    throw new ApiError(404, 'Room not found');
  }

  const property = await Property.findOne({ _id: roomDoc.property, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Room not found');
  }

  // Resolve tenant: explicit tenant must belong to room; otherwise fall back
  // to the room's active tenant so charges can be created room-first.
  let tenantId = null;
  if (tenant) {
    const tenantDoc = await Tenant.findOne({ _id: tenant, room, status: 'ACTIVE' });
    if (!tenantDoc) {
      throw new ApiError(400, 'Invalid tenant for this room');
    }
    tenantId = tenantDoc._id;
  } else {
    const activeTenant = await Tenant.findOne({ room, status: 'ACTIVE' });
    tenantId = activeTenant ? activeTenant._id : null;
  }

  // Check if rent charge already exists for this room and month
  const existingCharge = await RentCharge.findOne({ room, billingMonth });
  if (existingCharge) {
    throw new ApiError(400, 'Rent charge already exists for this room and month');
  }

  const charge = new RentCharge({
    room,
    tenant: tenantId,
    billingMonth,
    rentAmount,
    dueDate: dueDate ? new Date(dueDate) : null,
    notes,
  });

  await charge.save();
  return charge.toJSON();
};

/**
 * Get all rent charges
 */
export const getRentCharges = async (ownerId, filters = {}) => {
  const { status, billingMonth, propertyId, roomId } = filters;

  let query = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by billing month
  if (billingMonth) {
    query.billingMonth = billingMonth;
  }

  // Filter by property
  if (propertyId) {
    const property = await Property.findOne({ _id: propertyId, owner: ownerId });
    if (!property) {
      throw new ApiError(404, 'Property not found');
    }
    query.room = { $in: await Room.find({ property: propertyId }).distinct('_id') };
  }

  // Filter by room
  if (roomId) {
    const room = await Room.findById(roomId);
    if (!room) {
      throw new ApiError(404, 'Room not found');
    }
    const prop = await Property.findById(room.property);
    if (!prop || prop.owner.toString() !== ownerId) {
      throw new ApiError(404, 'Room not found');
    }
    query.room = roomId;
  }

  const charges = await RentCharge.find(query)
    .sort({ billingMonth: -1, createdAt: -1 })
    .lean();

  // Populate room and tenant info, and calculate totals
  const populatedCharges = await Promise.all(
    charges.map(async (charge) => {
      const room = await Room.findById(charge.room);
      const tenant = charge.tenant ? await Tenant.findById(charge.tenant) : null;
      const property = room ? await Property.findById(room.property) : null;

      const payments = await RentPayment.find({ rentCharge: charge._id });
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = calculateOutstanding(charge.rentAmount, totalPaid);

      return {
        ...charge,
        roomId: charge.room,
        roomName: room ? room.roomNumber : null,
        propertyId: property ? property._id : null,
        propertyName: property ? property.name : null,
        tenantName: tenant ? tenant.fullName : null,
        totalPaid,
        outstanding,
        paymentCount: payments.length,
        payments,
      };
    })
  );

  return populatedCharges;
};

/**
 * Get rent charge by ID
 */
export const getRentChargeById = async (chargeId, ownerId) => {
  const charge = await RentCharge.findById(chargeId);
  if (!charge) {
    throw new ApiError(404, 'Rent charge not found');
  }

  // Verify ownership
  const room = await Room.findById(charge.room);
  if (!room) {
    throw new ApiError(404, 'Rent charge not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Rent charge not found');
  }

  // Populate tenant and payments
  const tenant = charge.tenant ? await Tenant.findById(charge.tenant) : null;
  const payments = await RentPayment.find({ rentCharge: charge._id }).sort({ paymentDate: -1 });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = calculateOutstanding(charge.rentAmount, totalPaid);

  return {
    ...charge.toJSON(),
    roomId: charge.room,
    roomName: room.roomNumber,
    propertyId: room.property,
    propertyName: property ? property.name : null,
    tenantName: tenant ? tenant.fullName : null,
    totalPaid,
    outstanding,
    payments: payments.map(p => p.toJSON()),
  };
};

/**
 * Update rent charge
 */
export const updateRentCharge = async (chargeId, ownerId, updateData) => {
  const charge = await RentCharge.findById(chargeId);
  if (!charge) {
    throw new ApiError(404, 'Rent charge not found');
  }

  // Verify ownership
  const room = await Room.findById(charge.room);
  if (!room) {
    throw new ApiError(404, 'Rent charge not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Rent charge not found');
  }

  if (updateData.rentAmount !== undefined) {
    charge.rentAmount = updateData.rentAmount;
  }
  if (updateData.dueDate !== undefined) {
    charge.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
  }
  if (updateData.notes !== undefined) {
    charge.notes = updateData.notes;
  }

  await charge.save();

  // Recalculate status
  const payments = await RentPayment.find({ rentCharge: charge._id });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  charge.status = calculateRentStatus(charge.rentAmount, totalPaid);
  await charge.save();

  return charge.toJSON();
};

/**
 * Delete rent charge (and its payments)
 */
export const deleteRentCharge = async (chargeId, ownerId) => {
  const charge = await RentCharge.findById(chargeId);
  if (!charge) {
    throw new ApiError(404, 'Rent charge not found');
  }

  // Verify ownership
  const room = await Room.findById(charge.room);
  if (!room) {
    throw new ApiError(404, 'Rent charge not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Rent charge not found');
  }

  await RentPayment.deleteMany({ rentCharge: charge._id });
  await RentCharge.findByIdAndDelete(chargeId);

  return { message: 'Rent charge deleted successfully' };
};

/**
 * Add payment to rent charge
 */
export const addPayment = async (chargeId, ownerId, paymentData) => {
  const charge = await RentCharge.findById(chargeId);
  if (!charge) {
    throw new ApiError(404, 'Rent charge not found');
  }

  // Verify ownership
  const room = await Room.findById(charge.room);
  if (!room) {
    throw new ApiError(404, 'Rent charge not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Rent charge not found');
  }

  const payment = new RentPayment({
    rentCharge: chargeId,
    ...paymentData,
  });

  await payment.save();

  // Update charge status
  const payments = await RentPayment.find({ rentCharge: charge._id });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  charge.status = calculateRentStatus(charge.rentAmount, totalPaid);
  await charge.save();

  return payment.toJSON();
};

/**
 * Get payments for rent charge
 */
export const getChargePayments = async (chargeId, ownerId) => {
  const charge = await RentCharge.findById(chargeId);
  if (!charge) {
    throw new ApiError(404, 'Rent charge not found');
  }

  // Verify ownership
  const room = await Room.findById(charge.room);
  if (!room) {
    throw new ApiError(404, 'Rent charge not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Rent charge not found');
  }

  const payments = await RentPayment.find({ rentCharge: chargeId }).sort({ paymentDate: -1 });
  return payments.map(p => p.toJSON());
};

/**
 * Get tenant's rent history
 */
export const getTenantRentHistory = async (tenantId, ownerId) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }

  // Verify ownership
  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Tenant not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Tenant not found');
  }

  const charges = await RentCharge.find({ tenant: tenantId }).sort({ billingMonth: -1 });

  const history = await Promise.all(
    charges.map(async (charge) => {
      const payments = await RentPayment.find({ rentCharge: charge._id });
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = calculateOutstanding(charge.rentAmount, totalPaid);

      return {
        ...charge.toJSON(),
        totalPaid,
        outstanding,
        paymentCount: payments.length,
        payments: payments.map(p => p.toJSON()),
      };
    })
  );

  return history;
};
