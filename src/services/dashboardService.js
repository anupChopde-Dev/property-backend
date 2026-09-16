import { Property, Room, Tenant, TenantMember, RentCharge, RentPayment, ElectricityReading, Expense } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';
import { getCurrentMonth, calculateOutstanding } from '../utils/helpers.js';

/**
 * Get main dashboard data
 */
export const getDashboardData = async (ownerId) => {
  const now = new Date();
  const currentMonth = getCurrentMonth();

  // Get all properties
  const properties = await Property.find({ owner: ownerId, isActive: true });

  // Initialize stats
  let totalRooms = 0;
  let occupiedRooms = 0;
  let vacantRooms = 0;
  let maintenanceRooms = 0;
  let totalPeople = 0;
  let totalRoomHolders = 0;

  // Property IDs for querying
  const propertyIds = properties.map(p => p._id);

  // Get all rooms for all properties
  const rooms = await Room.find({ property: { $in: propertyIds } });

  // Calculate room stats
  rooms.forEach(room => {
    totalRooms++;
    if (room.status === 'OCCUPIED') {
      occupiedRooms++;
    } else if (room.status === 'VACANT') {
      vacantRooms++;
    } else if (room.status === 'MAINTENANCE') {
      maintenanceRooms++;
    }
  });

  // Get all active tenants and calculate people count
  const activeTenants = await Tenant.find({
    room: { $in: rooms.map(r => r._id) },
    status: 'ACTIVE',
  });

  totalRoomHolders = activeTenants.length;

  for (const tenant of activeTenants) {
    const memberCount = await TenantMember.countDocuments({ tenant: tenant._id, isActive: true });
    totalPeople += memberCount + 1; // +1 for tenant themselves
  };

  // Get current month rent charges for all rooms
  const rentCharges = await RentCharge.find({
    room: { $in: rooms.map(r => r._id) },
    billingMonth: currentMonth,
  });

  // Calculate rent financials
  let expectedRent = 0;
  let collectedRent = 0;

  for (const charge of rentCharges) {
    expectedRent += charge.rentAmount;

    const payments = await RentPayment.find({ rentCharge: charge._id });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    collectedRent += totalPaid;
  }

  const outstandingRent = calculateOutstanding(expectedRent, collectedRent);

  // Get current month electricity readings
  const electricityReadings = await ElectricityReading.find({
    room: { $in: rooms.map(r => r._id) },
    billingMonth: currentMonth,
  });

  const electricityCharges = electricityReadings.reduce((sum, r) => sum + r.totalAmount, 0);

  // Get current month expenses
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const propertyExpenses = await Expense.find({
    property: { $in: propertyIds },
    date: { $gte: monthStart, $lt: monthEnd },
  });

  const roomExpenses = await Expense.find({
    property: { $in: propertyIds },
    room: { $in: rooms.map(r => r._id) },
    date: { $gte: monthStart, $lt: monthEnd },
  });

  const totalExpenses = propertyExpenses.reduce((sum, e) => sum + e.amount, 0) +
                       roomExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate net result (rent + electricity - expenses)
  const netResult = expectedRent + electricityCharges - totalExpenses;

  // Alerts
  const alerts = await getDashboardAlerts(ownerId, currentMonth);

  return {
    stats: {
      totalProperties: properties.length,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      maintenanceRooms,
      totalRoomHolders,
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
      netResult,
    },
    alerts,
    currentMonth,
  };
};

/**
 * Get dashboard alerts
 */
const getDashboardAlerts = async (ownerId, currentMonth) => {
  const properties = await Property.find({ owner: ownerId, isActive: true });
  const propertyIds = properties.map(p => p._id);

  const rooms = await Room.find({ property: { $in: propertyIds } });
  const roomIds = rooms.map(r => r._id);

  // Rent overdue/pending alerts
  const rentCharges = await RentCharge.find({
    room: { $in: roomIds },
    billingMonth: currentMonth,
    status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
  });

  const rentAlerts = rentCharges.map(charge => {
    const room = rooms.find(r => r._id.toString() === charge.room.toString());
    const tenant = charge.tenant ? {
      fullName: charge.tenant, // Will be populated in service
    } : null;

    return {
      type: 'rent',
      severity: charge.status === 'OVERDUE' ? 'high' : 'medium',
      title: `${charge.status} Rent`,
      roomNumber: room ? room.roomNumber : 'Unknown',
      billingMonth: charge.billingMonth,
      amount: charge.rentAmount,
      outstanding: calculateOutstanding(charge.rentAmount, 0), // Will be updated with actual payments
    };
  });

  // Electricity readings pending alerts
  const occupiedRoomIds = rooms.filter(r => r.status === 'OCCUPIED').map(r => r._id);
  const existingReadings = await ElectricityReading.find({
    room: { $in: occupiedRoomIds },
    billingMonth: currentMonth,
  });

  const electricityAlerts = occupiedRoomIds
    .filter(id => !existingReadings.some(r => r.room.toString() === id.toString()))
    .map(roomId => {
      const room = rooms.find(r => r._id.toString() === roomId.toString());
      const tenant = room ? rooms.find(r => r._id.toString() === roomId.toString()) : null;

      return {
        type: 'electricity',
        severity: 'medium',
        title: 'Electricity Reading Pending',
        roomNumber: room ? room.roomNumber : 'Unknown',
        billingMonth: currentMonth,
      };
    });

  // Vacant rooms alerts
  const vacantRoomAlerts = rooms
    .filter(r => r.status === 'VACANT')
    .map(room => ({
      type: 'vacant',
      severity: 'low',
      title: 'Vacant Room',
      roomNumber: room.roomNumber,
      monthlyRent: room.monthlyRent,
    }));

  // Recently moved out tenants
  const recentlyMovedOut = await Tenant.find({
    room: { $in: roomIds },
    status: 'MOVED_OUT',
    leavingDate: {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    },
  }).sort({ leavingDate: -1 }).limit(5);

  const movedOutAlerts = recentlyMovedOut.map(tenant => ({
    type: 'moved_out',
    severity: 'info',
    title: 'Tenant Moved Out',
    tenantName: tenant.fullName,
    roomNumber: rooms.find(r => r._id.toString() === tenant.room.toString())?.roomNumber || 'Unknown',
    movedOutDate: tenant.leavingDate,
  }));

  return {
    rent: rentAlerts,
    electricity: electricityAlerts,
    vacant: vacantRoomAlerts,
    movedOut: movedOutAlerts,
  };
};

/**
 * Get property dashboard data
 */
export const getPropertyDashboardData = async (propertyId, ownerId) => {
  // Verify ownership
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  const now = new Date();
  const currentMonth = getCurrentMonth();

  // Get rooms
  const rooms = await Room.find({ property: propertyId }).sort({ roomNumber: 1 });

  // Calculate room stats
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const vacantRooms = rooms.filter(r => r.status === 'VACANT').length;
  const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;

  // Calculate total people
  let totalPeople = 0;
  for (const room of rooms) {
    if (room.status === 'OCCUPIED') {
      const tenants = await Tenant.find({ room: room._id, status: 'ACTIVE' });
      for (const tenant of tenants) {
        const memberCount = await TenantMember.countDocuments({ tenant: tenant._id, isActive: true });
        totalPeople += memberCount + 1;
      }
    }
  }

  // Get current month rent charges
  const rentCharges = await RentCharge.find({
    room: { $in: rooms.map(r => r._id) },
    billingMonth: currentMonth,
  });

  let expectedRent = 0;
  let collectedRent = 0;
  let outstandingRent = 0;

  const rentDetails = [];

  for (const charge of rentCharges) {
    expectedRent += charge.rentAmount;

    const payments = await RentPayment.find({ rentCharge: charge._id });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    collectedRent += totalPaid;

    const outstanding = calculateOutstanding(charge.rentAmount, totalPaid);
    outstandingRent += outstanding;

    const room = rooms.find(r => r._id.toString() === charge.room.toString());

    rentDetails.push({
      roomId: charge.room,
      roomNumber: room ? room.roomNumber : 'Unknown',
      tenant: charge.tenant,
      rentAmount: charge.rentAmount,
      totalPaid,
      outstanding,
      status: charge.status,
    });
  }

  // Get current month electricity readings
  const electricityReadings = await ElectricityReading.find({
    property: propertyId,
    billingMonth: currentMonth,
  });

  const electricityCharges = electricityReadings.reduce((sum, r) => sum + r.totalAmount, 0);

  const electricityDetails = electricityReadings.map(reading => {
    const room = rooms.find(r => r._id.toString() === reading.room.toString());
    return {
      roomId: reading.room,
      roomNumber: room ? room.roomNumber : 'Unknown',
      tenant: reading.tenant,
      units: reading.consumedUnits,
      amount: reading.totalAmount,
    };
  });

  // Get current month expenses
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const propertyExpenses = await Expense.find({
    property: propertyId,
    room: null, // Property-level only
    date: { $gte: monthStart, $lt: monthEnd },
  });

  const roomExpenses = await Expense.find({
    property: propertyId,
    room: { $in: rooms.map(r => r._id) },
    date: { $gte: monthStart, $lt: monthEnd },
  });

  const propertyExpensesTotal = propertyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const roomExpensesTotal = roomExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Get recent activity
  const recentRentPayments = await RentPayment.find({
    rentCharge: { $in: rentCharges.map(c => c._id) },
  })
    .sort({ paymentDate: -1 })
    .limit(10);

  const recentExpenses = [...propertyExpenses, ...roomExpenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

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
      propertyExpenses: propertyExpensesTotal,
      roomExpenses: roomExpensesTotal,
      totalExpenses: propertyExpensesTotal + roomExpensesTotal,
      netResult: expectedRent + electricityCharges - propertyExpensesTotal - roomExpensesTotal,
    },
    rentDetails,
    electricityDetails,
    recentActivity: {
      payments: recentRentPayments.map(p => ({
        ...p.toJSON(),
        rentChargeId: p.rentCharge,
      })),
      expenses: recentExpenses.map(e => e.toJSON()),
    },
    currentMonth,
  };
};
