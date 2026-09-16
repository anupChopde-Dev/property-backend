import { ElectricityReading, Room, Tenant, Property } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';
import { calculateElectricity } from '../utils/helpers.js';

/**
 * Create an electricity reading for a month
 */
export const createElectricityReading = async (ownerId, readingData) => {
  const {
    room,
    tenant,
    billingMonth,
    previousReading,
    currentReading,
    ratePerUnit,
    readingDate,
    notes,
    fixedCharge,
    otherCharge,
  } = readingData;

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
  // to the room's active tenant so readings can be created room-first.
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

  // Validate readings
  if (currentReading < previousReading) {
    throw new ApiError(400, 'Current reading cannot be lower than previous reading. If meter was reset, please record a meter replacement event.');
  }

  // Check for duplicate reading
  const existingReading = await ElectricityReading.findOne({ room, billingMonth });
  if (existingReading) {
    throw new ApiError(400, 'Electricity reading already exists for this room and month. Please edit the existing record.');
  }

  // Calculate consumption
  const { consumedUnits, energyAmount } = calculateElectricity(
    previousReading,
    currentReading,
    ratePerUnit
  );

  const totalAmount = energyAmount + (fixedCharge || 0) + (otherCharge || 0);

  const reading = new ElectricityReading({
    property: property._id,
    room,
    tenant: tenantId,
    billingMonth,
    previousReading,
    currentReading,
    consumedUnits,
    ratePerUnit,
    energyAmount,
    fixedCharge: fixedCharge || 0,
    otherCharge: otherCharge || 0,
    totalAmount,
    readingDate: new Date(readingDate),
    notes,
  });

  await reading.save();
  return reading.toJSON();
};

/**
 * Get all electricity readings
 */
export const getElectricityReadings = async (ownerId, filters = {}) => {
  const { billingMonth, propertyId, roomId } = filters;

  let query = {};

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
    query.property = propertyId;
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

  const readings = await ElectricityReading.find(query)
    .sort({ billingMonth: -1, readingDate: -1 })
    .lean();

  // Populate room, tenant info
  const populatedReadings = await Promise.all(
    readings.map(async (reading) => {
      const room = await Room.findById(reading.room);
      const tenant = reading.tenant ? await Tenant.findById(reading.tenant) : null;
      const property = await Property.findById(reading.property);

      return {
        ...reading,
        roomId: reading.room,
        roomName: room ? room.roomNumber : null,
        tenantName: tenant ? tenant.fullName : null,
        propertyId: property ? property._id : null,
        propertyName: property ? property.name : null,
      };
    })
  );

  return populatedReadings;
};

/**
 * Get electricity reading by ID
 */
export const getElectricityReadingById = async (readingId, ownerId) => {
  const reading = await ElectricityReading.findById(readingId);
  if (!reading) {
    throw new ApiError(404, 'Electricity reading not found');
  }

  // Verify ownership
  const property = await Property.findById(reading.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Electricity reading not found');
  }

  const room = await Room.findById(reading.room);
  const tenant = reading.tenant ? await Tenant.findById(reading.tenant) : null;

  return {
    ...reading.toJSON(),
    roomId: reading.room,
    roomName: room ? room.roomNumber : null,
    tenantName: tenant ? tenant.fullName : null,
    propertyId: property._id,
    propertyName: property.name,
  };
};

/**
 * Update electricity reading
 */
export const updateElectricityReading = async (readingId, ownerId, updateData) => {
  const reading = await ElectricityReading.findById(readingId);
  if (!reading) {
    throw new ApiError(404, 'Electricity reading not found');
  }

  // Verify ownership
  const property = await Property.findById(reading.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Electricity reading not found');
  }

  // If updating previous or current reading, validate and recalculate
  if (updateData.previousReading !== undefined || updateData.currentReading !== undefined) {
    const prevReading = updateData.previousReading !== undefined
      ? updateData.previousReading
      : reading.previousReading;

    const currReading = updateData.currentReading !== undefined
      ? updateData.currentReading
      : reading.currentReading;

    if (currReading < prevReading) {
      throw new ApiError(400, 'Current reading cannot be lower than previous reading');
    }

    const { consumedUnits, energyAmount } = calculateElectricity(
      prevReading,
      currReading,
      updateData.ratePerUnit !== undefined ? updateData.ratePerUnit : reading.ratePerUnit
    );

    reading.previousReading = prevReading;
    reading.currentReading = currReading;
    reading.consumedUnits = consumedUnits;
    reading.energyAmount = energyAmount;
    reading.totalAmount = energyAmount + reading.fixedCharge + reading.otherCharge;
  }

  if (updateData.ratePerUnit !== undefined) {
    const { energyAmount } = calculateElectricity(
      reading.previousReading,
      reading.currentReading,
      updateData.ratePerUnit
    );
    reading.ratePerUnit = updateData.ratePerUnit;
    reading.energyAmount = energyAmount;
    reading.totalAmount = energyAmount + reading.fixedCharge + reading.otherCharge;
  }

  if (updateData.readingDate !== undefined) {
    reading.readingDate = updateData.readingDate ? new Date(updateData.readingDate) : null;
  }

  if (updateData.notes !== undefined) {
    reading.notes = updateData.notes;
  }

  if (updateData.fixedCharge !== undefined) {
    reading.fixedCharge = updateData.fixedCharge;
    reading.totalAmount = reading.energyAmount + updateData.fixedCharge + reading.otherCharge;
  }

  if (updateData.otherCharge !== undefined) {
    reading.otherCharge = updateData.otherCharge;
    reading.totalAmount = reading.energyAmount + reading.fixedCharge + updateData.otherCharge;
  }

  await reading.save();

  return reading.toJSON();
};

/**
 * Delete electricity reading
 */
export const deleteElectricityReading = async (readingId, ownerId) => {
  const reading = await ElectricityReading.findById(readingId);
  if (!reading) {
    throw new ApiError(404, 'Electricity reading not found');
  }

  // Verify ownership
  const property = await Property.findById(reading.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Electricity reading not found');
  }

  await ElectricityReading.findByIdAndDelete(readingId);

  return { message: 'Electricity reading deleted successfully' };
};

/**
 * Get room electricity history
 */
export const getRoomElectricityHistory = async (roomId, ownerId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Room not found');
  }

  const readings = await ElectricityReading.find({ room: roomId })
    .sort({ billingMonth: -1 });

  return {
    room: room.toJSON(),
    readings: readings.map(r => r.toJSON()),
  };
};

/**
 * Get previous reading for a room
 */
export const getPreviousReading = async (roomId, billingMonth) => {
  // Find the most recent reading before the given month
  const [year, month] = billingMonth.split('-').map(Number);
  const previousMonth = new Date(year, month - 2, 1);
  const previousMonthStr = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

  const previousReading = await ElectricityReading.findOne({
    room: roomId,
    billingMonth: previousMonthStr,
  }).sort({ billingMonth: -1 });

  return previousReading ? previousReading.currentReading : null;
};

/**
 * Get electricity report for a period
 */
export const getElectricityReport = async (ownerId, propertyId, fromMonth, toMonth) => {
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  const readings = await ElectricityReading.find({
    property: propertyId,
    billingMonth: {
      $gte: fromMonth,
      $lte: toMonth,
    },
  }).sort({ billingMonth: 1, room: 1 });

  // Group by room
  const groupedByRoom = {};
  readings.forEach((reading) => {
    if (!groupedByRoom[reading.room.toString()]) {
      groupedByRoom[reading.room.toString()] = {
        roomName: reading.room,
        totalUnits: 0,
        totalAmount: 0,
        months: [],
      };
    }
    groupedByRoom[reading.room.toString()].totalUnits += reading.consumedUnits;
    groupedByRoom[reading.room.toString()].totalAmount += reading.totalAmount;
    groupedByRoom[reading.room.toString()].months.push({
      month: reading.billingMonth,
      units: reading.consumedUnits,
      amount: reading.totalAmount,
    });
  });

  return {
    property: property.name,
    fromMonth,
    toMonth,
    totalUnits: readings.reduce((sum, r) => sum + r.consumedUnits, 0),
    totalAmount: readings.reduce((sum, r) => sum + r.totalAmount, 0),
    byRoom: Object.values(groupedByRoom),
  };
};
