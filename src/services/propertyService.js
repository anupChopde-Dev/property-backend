import { Property, Room, Tenant, TenantMember, RentCharge, RentPayment, Expense, ElectricityReading } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';

/**
 * Create a new property
 */
export const createProperty = async (ownerId, propertyData) => {
  const property = new Property({
    ...propertyData,
    owner: ownerId,
  });

  await property.save();
  return property.toJSON();
};

/**
 * Get all properties for owner
 */
export const getProperties = async (ownerId, filters = {}) => {
  const { isActive = true } = filters;

  const query = { owner: ownerId };
  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  const properties = await Property.find(query)
    .sort({ createdAt: -1 })
    .lean();

  // Populate rooms count for each property
  const propertiesWithCounts = await Promise.all(
    properties.map(async (property) => {
      const roomCount = await Room.countDocuments({ property: property._id, status: 'OCCUPIED' });
      const totalRooms = await Room.countDocuments({ property: property._id });

      return {
        ...property,
        occupiedRooms: roomCount,
        totalRooms,
      };
    })
  );

  return propertiesWithCounts;
};

/**
 * Get property by ID
 */
export const getPropertyById = async (propertyId, ownerId) => {
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });

  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  return property.toJSON();
};

/**
 * Update property
 */
export const updateProperty = async (propertyId, ownerId, updateData) => {
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });

  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  Object.assign(property, updateData);
  await property.save();

  return property.toJSON();
};

/**
 * Delete/deactivate property
 */
export const deleteProperty = async (propertyId, ownerId) => {
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });

  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  // Soft delete - deactivate property
  property.isActive = false;
  await property.save();

  return { message: 'Property deactivated successfully' };
};

/**
 * Get property dashboard data
 */
export const getPropertyDashboard = async (propertyId, ownerId) => {
  // Verify ownership
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  // Get rooms data
  const rooms = await Room.find({ property: propertyId });
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const vacantRooms = rooms.filter(r => r.status === 'VACANT').length;
  const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;

  // Get total people count
  let totalPeople = 0;
  for (const room of rooms) {
    if (room.status === 'OCCUPIED') {
      const tenants = await Tenant.find({ room: room._id, status: 'ACTIVE' });
      for (const tenant of tenants) {
        const memberCount = await TenantMember.countDocuments({ tenant: tenant._id, isActive: true });
        totalPeople += memberCount + 1; // +1 for the tenant themselves
      }
    }
  }

  // Get current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Get rent data for current month
  const rentCharges = await RentCharge.find({
    room: { $in: rooms.map(r => r._id) },
    billingMonth: currentMonth,
  });

  const expectedRent = rentCharges.reduce((sum, charge) => sum + charge.rentAmount, 0);

  // Calculate collected rent
  let collectedRent = 0;
  for (const charge of rentCharges) {
    const payments = await RentPayment.find({ rentCharge: charge._id });
    collectedRent += payments.reduce((sum, p) => sum + p.amount, 0);
  }

  const outstandingRent = expectedRent - collectedRent;

  // Get electricity data
  const electricityReadings = await ElectricityReading.find({
    room: { $in: rooms.map(r => r._id) },
    billingMonth: currentMonth,
  });

  const electricityCharges = electricityReadings.reduce((sum, r) => sum + r.totalAmount, 0);

  // Get expenses for current month
  const propertyExpenses = await Expense.find({
    property: propertyId,
    date: {
      $gte: new Date(now.getFullYear(), now.getMonth(), 1),
      $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    },
  });

  const roomExpenses = await Expense.find({
    property: propertyId,
    room: { $in: rooms.map(r => r._id) },
    date: {
      $gte: new Date(now.getFullYear(), now.getMonth(), 1),
      $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    },
  });

  const totalExpenses = propertyExpenses.reduce((sum, e) => sum + e.amount, 0) +
                       roomExpenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    property,
    stats: {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      maintenanceRooms,
      totalPeople,
    },
    finance: {
      expectedRent,
      collectedRent,
      outstandingRent,
      electricityCharges,
      propertyExpenses: propertyExpenses.reduce((sum, e) => sum + e.amount, 0),
      roomExpenses: roomExpenses.reduce((sum, e) => sum + e.amount, 0),
      totalExpenses,
      netResult: expectedRent + electricityCharges - totalExpenses,
    },
    recentItems: {
      rentCharges: rentCharges.slice(0, 5),
      expenses: propertyExpenses.concat(roomExpenses).slice(0, 5),
    },
  };
};

/**
 * Get property stats for dashboard
 */
export const getPropertyStats = async (ownerId) => {
  const properties = await Property.find({ owner: ownerId, isActive: true });

  let totalRooms = 0;
  let occupiedRooms = 0;
  let vacantRooms = 0;
  let totalPeople = 0;

  for (const property of properties) {
    const rooms = await Room.find({ property: property._id });
    totalRooms += rooms.length;
    occupiedRooms += rooms.filter(r => r.status === 'OCCUPIED').length;
    vacantRooms += rooms.filter(r => r.status === 'VACANT').length;

    for (const room of rooms) {
      if (room.status === 'OCCUPIED') {
        const tenants = await Tenant.find({ room: room._id, status: 'ACTIVE' });
        for (const tenant of tenants) {
          const memberCount = await TenantMember.countDocuments({ tenant: tenant._id, isActive: true });
          totalPeople += memberCount + 1;
        }
      }
    }
  }

  return {
    totalProperties: properties.length,
    totalRooms,
    occupiedRooms,
    vacantRooms,
    totalPeople,
  };
};
