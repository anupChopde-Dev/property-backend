import { Property, Room, Tenant, RentCharge, RentPayment, ElectricityReading, Expense, TenantDocument } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';

/**
 * Get monthly report
 */
export const getMonthlyReport = async (ownerId, month, propertyId = null) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new ApiError(400, 'Invalid month format. Use YYYY-MM');
  }

  let properties = await Property.find({ owner: ownerId, isActive: true });

  if (propertyId) {
    properties = properties.filter(p => p._id.toString() === propertyId);
    if (properties.length === 0) {
      throw new ApiError(404, 'Property not found');
    }
  }

  const propertyIds = properties.map(p => p._id);
  const rooms = await Room.find({ property: { $in: propertyIds } });
  const roomIds = rooms.map(r => r._id);

  // Rent report
  const rentCharges = await RentCharge.find({
    room: { $in: roomIds },
    billingMonth: month,
  });

  const rentData = await Promise.all(
    rentCharges.map(async (charge) => {
      const room = rooms.find(r => r._id.toString() === charge.room.toString());
      const property = room ? properties.find(p => p._id.toString() === room.property.toString()) : null;
      const tenant = await Tenant.findById(charge.tenant);
      const payments = await RentPayment.find({ rentCharge: charge._id });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = charge.rentAmount - totalPaid;

      return {
        roomId: charge.room,
        roomNumber: room ? room.roomNumber : 'Unknown',
        propertyName: property ? property.name : 'Unknown',
        tenantName: tenant ? tenant.fullName : 'Unknown',
        rentAmount: charge.rentAmount,
        totalPaid,
        outstanding,
        status: charge.status,
        paymentCount: payments.length,
        payments,
      };
    })
  );

  // Electricity report
  const electricityReadings = await ElectricityReading.find({
    room: { $in: roomIds },
    billingMonth: month,
  });

  const electricityData = electricityReadings.map(reading => {
    const room = rooms.find(r => r._id.toString() === reading.room.toString());
    const property = room ? properties.find(p => p._id.toString() === room.property.toString()) : null;

    return {
      readingId: reading._id,
      roomId: reading.room,
      roomNumber: room ? room.roomNumber : 'Unknown',
      propertyName: property ? property.name : 'Unknown',
      tenantId: reading.tenant,
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      consumedUnits: reading.consumedUnits,
      ratePerUnit: reading.ratePerUnit,
      energyAmount: reading.energyAmount,
      fixedCharge: reading.fixedCharge,
      otherCharge: reading.otherCharge,
      totalAmount: reading.totalAmount,
      readingDate: reading.readingDate,
    };
  });

  // Expense report
  const monthStart = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1, 1);
  const monthEnd = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 1);

  const expenses = await Expense.find({
    property: { $in: propertyIds },
    date: { $gte: monthStart, $lt: monthEnd },
  });

  const expenseData = expenses.map(expense => {
    const room = expense.room ? rooms.find(r => r._id.toString() === expense.room.toString()) : null;
    const property = properties.find(p => p._id.toString() === expense.property.toString());

    return {
      expenseId: expense._id,
      propertyName: property ? property.name : 'Unknown',
      roomId: expense.room,
      roomNumber: room ? room.roomNumber : null,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      description: expense.description,
      notes: expense.notes,
    };
  });

  const expectedRent = rentData.reduce((sum, r) => sum + r.rentAmount, 0);
  const collectedRent = rentData.reduce((sum, r) => sum + r.totalPaid, 0);
  const outstandingRent = rentData.reduce((sum, r) => sum + r.outstanding, 0);
  const electricityCharges = electricityData.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalExpenses = expenseData.reduce((sum, e) => sum + e.amount, 0);

  const targetProperty = propertyId ? properties.find(p => p._id.toString() === propertyId) : null;

  return {
    month: month,
    monthDisplay: new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1, 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    property: targetProperty ? targetProperty.name : 'All Properties',
    rent: {
      total: rentData.length,
      expectedRent,
      collectedRent,
      outstandingRent,
      byStatus: {
        paid: rentData.filter(r => r.status === 'PAID').length,
        partial: rentData.filter(r => r.status === 'PARTIAL').length,
        pending: rentData.filter(r => r.status === 'PENDING').length,
        overdue: rentData.filter(r => r.status === 'OVERDUE').length,
      },
      details: rentData,
    },
    electricity: {
      total: electricityData.length,
      totalUnits: electricityData.reduce((sum, e) => sum + e.consumedUnits, 0),
      totalAmount: electricityCharges,
      details: electricityData,
    },
    expenses: {
      total: expenseData.length,
      totalAmount: totalExpenses,
      byCategory: {},
      details: expenseData,
    },
    summary: {
      expectedRent,
      collectedRent,
      outstandingRent,
      electricityCharges,
      totalExpenses,
      netResult: expectedRent + electricityCharges - totalExpenses,
    },
  };
};

/**
 * Get rent report
 */
export const getRentReport = async (ownerId, propertyId = null, status = null) => {
  let properties = await Property.find({ owner: ownerId, isActive: true });

  if (propertyId) {
    properties = properties.filter(p => p._id.toString() === propertyId);
    if (properties.length === 0) {
      throw new ApiError(404, 'Property not found');
    }
  }

  const propertyIds = properties.map(p => p._id);
  const rooms = await Room.find({ property: { $in: propertyIds } });
  const roomIds = rooms.map(r => r._id);

  let query = { room: { $in: roomIds } };
  if (status) {
    query.status = status;
  }

  const rentCharges = await RentCharge.find(query).sort({ billingMonth: -1, createdAt: -1 });

  const rentData = await Promise.all(
    rentCharges.map(async (charge) => {
      const room = rooms.find(r => r._id.toString() === charge.room.toString());
      const property = room ? properties.find(p => p._id.toString() === room.property.toString()) : null;
      const tenant = await Tenant.findById(charge.tenant);
      const payments = await RentPayment.find({ rentCharge: charge._id });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = charge.rentAmount - totalPaid;

      return {
        chargeId: charge._id,
        propertyName: property ? property.name : 'Unknown',
        propertyId: property ? property._id : null,
        roomId: charge.room,
        roomNumber: room ? room.roomNumber : 'Unknown',
        tenantId: charge.tenant,
        tenantName: tenant ? tenant.fullName : 'Unknown',
        billingMonth: charge.billingMonth,
        rentAmount: charge.rentAmount,
        totalPaid,
        outstanding,
        status: charge.status,
        dueDate: charge.dueDate,
        paymentCount: payments.length,
        createdAt: charge.createdAt,
      };
    })
  );

  const summary = {
    total: rentData.length,
    byStatus: {
      paid: rentData.filter(r => r.status === 'PAID').length,
      partial: rentData.filter(r => r.status === 'PARTIAL').length,
      pending: rentData.filter(r => r.status === 'PENDING').length,
      overdue: rentData.filter(r => r.status === 'OVERDUE').length,
    },
    totalRentAmount: rentData.reduce((sum, r) => sum + r.rentAmount, 0),
    totalCollected: rentData.reduce((sum, r) => sum + r.totalPaid, 0),
    totalOutstanding: rentData.reduce((sum, r) => sum + r.outstanding, 0),
  };

  const targetProperty = propertyId ? properties.find(p => p._id.toString() === propertyId) : null;

  return {
    property: targetProperty ? targetProperty.name : 'All Properties',
    status: status || 'all',
    summary,
    data: rentData,
  };
};

/**
 * Get outstanding rent report
 */
export const getOutstandingRentReport = async (ownerId, propertyId = null) => {
  let properties = await Property.find({ owner: ownerId, isActive: true });

  if (propertyId) {
    properties = properties.filter(p => p._id.toString() === propertyId);
    if (properties.length === 0) {
      throw new ApiError(404, 'Property not found');
    }
  }

  const propertyIds = properties.map(p => p._id);
  const rooms = await Room.find({ property: { $in: propertyIds } });
  const roomIds = rooms.map(r => r._id);

  const rentCharges = await RentCharge.find({
    room: { $in: roomIds },
    status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
  }).sort({ status: 1, dueDate: 1 });

  const outstandingData = await Promise.all(
    rentCharges.map(async (charge) => {
      const room = rooms.find(r => r._id.toString() === charge.room.toString());
      const property = room ? properties.find(p => p._id.toString() === room.property.toString()) : null;
      const tenant = await Tenant.findById(charge.tenant);
      const payments = await RentPayment.find({ rentCharge: charge._id });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = charge.rentAmount - totalPaid;

      return {
        chargeId: charge._id,
        propertyName: property ? property.name : 'Unknown',
        propertyId: property ? property._id : null,
        roomId: charge.room,
        roomNumber: room ? room.roomNumber : 'Unknown',
        tenantId: charge.tenant,
        tenantName: tenant ? tenant.fullName : 'Unknown',
        tenantMobile: tenant ? tenant.mobile : null,
        billingMonth: charge.billingMonth,
        rentAmount: charge.rentAmount,
        totalPaid,
        outstanding,
        status: charge.status,
        dueDate: charge.dueDate,
        daysOverdue: charge.dueDate ? Math.floor((Date.now() - new Date(charge.dueDate)) / (1000 * 60 * 60 * 24)) : null,
      };
    })
  );

  const byProperty = {};
  outstandingData.forEach(item => {
    if (!byProperty[item.propertyId]) {
      byProperty[item.propertyId] = {
        propertyName: item.propertyName,
        totalOutstanding: 0,
        count: 0,
        items: [],
      };
    }
    byProperty[item.propertyId].totalOutstanding += item.outstanding;
    byProperty[item.propertyId].count += 1;
    byProperty[item.propertyId].items.push(item);
  });

  const totalOutstanding = outstandingData.reduce((sum, item) => sum + item.outstanding, 0);
  const targetProperty = propertyId ? properties.find(p => p._id.toString() === propertyId) : null;

  return {
    property: targetProperty ? targetProperty.name : 'All Properties',
    generatedAt: new Date(),
    totalOutstanding,
    totalCount: outstandingData.length,
    byProperty: Object.values(byProperty),
    data: outstandingData,
  };
};

/**
 * Get electricity consumption report
 */
export const getElectricityReport = async (ownerId, propertyId = null, fromMonth = null, toMonth = null) => {
  let properties = await Property.find({ owner: ownerId, isActive: true });

  if (propertyId) {
    properties = properties.filter(p => p._id.toString() === propertyId);
    if (properties.length === 0) {
      throw new ApiError(404, 'Property not found');
    }
  }

  const propertyIds = properties.map(p => p._id);
  const rooms = await Room.find({ property: { $in: propertyIds } });
  const roomIds = rooms.map(r => r._id);

  let query = { room: { $in: roomIds } };

  if (fromMonth && toMonth) {
    query.billingMonth = { $gte: fromMonth, $lte: toMonth };
  } else if (fromMonth) {
    query.billingMonth = { $gte: fromMonth };
  } else if (toMonth) {
    query.billingMonth = { $lte: toMonth };
  }

  const readings = await ElectricityReading.find(query).sort({ billingMonth: 1, room: 1 });

  const byRoom = {};
  readings.forEach(reading => {
    const roomIdStr = reading.room.toString();
    if (!byRoom[roomIdStr]) {
      const room = rooms.find(r => r._id.toString() === roomIdStr);
      const property = room ? properties.find(p => p._id.toString() === room.property.toString()) : null;
      byRoom[roomIdStr] = {
        roomId: reading.room,
        roomNumber: room ? room.roomNumber : 'Unknown',
        propertyName: property ? property.name : 'Unknown',
        totalUnits: 0,
        totalAmount: 0,
        months: [],
        avgUnits: 0,
      };
    }
    byRoom[roomIdStr].totalUnits += reading.consumedUnits;
    byRoom[roomIdStr].totalAmount += reading.totalAmount;
    byRoom[roomIdStr].months.push({
      month: reading.billingMonth,
      units: reading.consumedUnits,
      amount: reading.totalAmount,
      rate: reading.ratePerUnit,
    });
  });

  Object.values(byRoom).forEach(room => {
    room.avgUnits = room.months.length > 0 ? room.totalUnits / room.months.length : 0;
  });

  const totalUnits = readings.reduce((sum, r) => sum + r.consumedUnits, 0);
  const totalAmount = readings.reduce((sum, r) => sum + r.totalAmount, 0);
  const monthCount = new Set(readings.map(r => r.billingMonth)).size;
  const targetProperty = propertyId ? properties.find(p => p._id.toString() === propertyId) : null;

  return {
    property: targetProperty ? targetProperty.name : 'All Properties',
    fromMonth,
    toMonth,
    monthCount,
    totalUnits,
    totalAmount,
    byRoom: Object.values(byRoom),
    data: readings.map(r => ({
      readingId: r._id,
      roomId: r.room,
      roomNumber: rooms.find(room => room._id.toString() === r.room.toString())?.roomNumber || 'Unknown',
      billingMonth: r.billingMonth,
      previousReading: r.previousReading,
      currentReading: r.currentReading,
      units: r.consumedUnits,
      rate: r.ratePerUnit,
      amount: r.totalAmount,
      readingDate: r.readingDate,
    })),
  };
};

/**
 * Get expense report
 */
export const getExpenseReport = async (ownerId, propertyId = null, fromDate = null, toDate = null) => {
  let properties = await Property.find({ owner: ownerId, isActive: true });

  if (propertyId) {
    properties = properties.filter(p => p._id.toString() === propertyId);
    if (properties.length === 0) {
      throw new ApiError(404, 'Property not found');
    }
  }

  const propertyIds = properties.map(p => p._id);

  let query = { property: { $in: propertyIds } };

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) query.date.$gte = new Date(fromDate);
    if (toDate) query.date.$lte = new Date(toDate);
  }

  const expenses = await Expense.find(query).sort({ date: -1 });
  const rooms = await Room.find({ property: { $in: propertyIds } });

  const expenseData = expenses.map(expense => {
    const room = expense.room ? rooms.find(r => r._id.toString() === expense.room.toString()) : null;
    const property = properties.find(p => p._id.toString() === expense.property.toString());

    return {
      expenseId: expense._id,
      propertyName: property ? property.name : 'Unknown',
      propertyId: expense.property,
      roomId: expense.room,
      roomNumber: room ? room.roomNumber : null,
      isRoomExpense: !!expense.room,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      description: expense.description,
      notes: expense.notes,
      createdAt: expense.createdAt,
    };
  });

  const byCategory = {};
  expenseData.forEach(item => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = {
        category: item.category,
        totalAmount: 0,
        count: 0,
      };
    }
    byCategory[item.category].totalAmount += item.amount;
    byCategory[item.category].count += 1;
  });

  const byProperty = {};
  expenseData.forEach(item => {
    if (!byProperty[item.propertyId]) {
      byProperty[item.propertyId] = {
        propertyName: item.propertyName,
        totalAmount: 0,
        count: 0,
        roomExpenses: 0,
        propertyExpenses: 0,
      };
    }
    byProperty[item.propertyId].totalAmount += item.amount;
    byProperty[item.propertyId].count += 1;
    if (item.isRoomExpense) {
      byProperty[item.propertyId].roomExpenses += item.amount;
    } else {
      byProperty[item.propertyId].propertyExpenses += item.amount;
    }
  });

  const totalExpenses = expenseData.reduce((sum, item) => sum + item.amount, 0);
  const roomExpensesTotal = expenseData.filter(item => item.isRoomExpense).reduce((sum, item) => sum + item.amount, 0);
  const propertyExpensesTotal = totalExpenses - roomExpensesTotal;
  const targetProperty = propertyId ? properties.find(p => p._id.toString() === propertyId) : null;

  return {
    property: targetProperty ? targetProperty.name : 'All Properties',
    fromDate,
    toDate,
    totalExpenses,
    roomExpensesTotal,
    propertyExpensesTotal,
    byCategory: Object.values(byCategory),
    byProperty: Object.values(byProperty),
    data: expenseData,
  };
};