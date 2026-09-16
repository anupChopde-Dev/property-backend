import { Expense, Property, Room } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';

/**
 * Create an expense
 */
export const createExpense = async (ownerId, expenseData) => {
  const { property, room, category, amount, date, description, notes } = expenseData;

  // Verify property ownership
  const propertyDoc = await Property.findById(property);
  if (!propertyDoc) {
    throw new ApiError(404, 'Property not found');
  }

  if (propertyDoc.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Property not found');
  }

  // If room is specified, verify room belongs to property
  if (room) {
    const roomDoc = await Room.findById(room);
    if (!roomDoc) {
      throw new ApiError(404, 'Room not found');
    }
    if (roomDoc.property.toString() !== property) {
      throw new ApiError(400, 'Room does not belong to this property');
    }

    // Check room ownership through property
    const prop = await Property.findById(roomDoc.property);
    if (!prop || prop.owner.toString() !== ownerId) {
      throw new ApiError(404, 'Room not found');
    }
  }

  const expense = new Expense({
    property,
    room: room || null,
    category,
    amount,
    date: new Date(date),
    description,
    notes,
  });

  await expense.save();
  return expense.toJSON();
};

/**
 * Get all expenses
 */
export const getExpenses = async (ownerId, filters = {}) => {
  const { propertyId, roomId, category, fromDate, toDate } = filters;

  let query = {};

  // Filter by property
  if (propertyId) {
    const property = await Property.findOne({ _id: propertyId, owner: ownerId });
    if (!property) {
      throw new ApiError(404, 'Property not found');
    }
    query.property = propertyId;
  } else {
    // Get all properties for owner if no specific property
    const properties = await Property.find({ owner: ownerId, isActive: true }).distinct('_id');
    query.property = { $in: properties };
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

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by date range
  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) {
      query.date.$gte = new Date(fromDate);
    }
    if (toDate) {
      query.date.$lte = new Date(toDate);
    }
  }

  const expenses = await Expense.find(query)
    .sort({ date: -1 })
    .lean();

  // Populate property and room info
  const populatedExpenses = await Promise.all(
    expenses.map(async (expense) => {
      const property = await Property.findById(expense.property);
      const room = expense.room ? await Room.findById(expense.room) : null;

      return {
        ...expense,
        propertyName: property ? property.name : null,
        roomName: room ? room.roomNumber : null,
        isRoomExpense: !!expense.room,
      };
    })
  );

  return populatedExpenses;
};

/**
 * Get expense by ID
 */
export const getExpenseById = async (expenseId, ownerId) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  // Verify ownership
  const property = await Property.findById(expense.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Expense not found');
  }

  const room = expense.room ? await Room.findById(expense.room) : null;

  return {
    ...expense.toJSON(),
    propertyName: property.name,
    roomName: room ? room.roomNumber : null,
    isRoomExpense: !!expense.room,
  };
};

/**
 * Update expense
 */
export const updateExpense = async (expenseId, ownerId, updateData) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  // Verify ownership
  const property = await Property.findById(expense.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Expense not found');
  }

  // Validate room if changing
  if (updateData.room !== undefined) {
    if (updateData.room) {
      const room = await Room.findById(updateData.room);
      if (!room) {
        throw new ApiError(404, 'Room not found');
      }
      if (room.property.toString() !== expense.property.toString()) {
        throw new ApiError(400, 'Room does not belong to this property');
      }
    }
    expense.room = updateData.room;
  }

  if (updateData.category !== undefined) {
    expense.category = updateData.category;
  }
  if (updateData.amount !== undefined) {
    expense.amount = updateData.amount;
  }
  if (updateData.date !== undefined) {
    expense.date = new Date(updateData.date);
  }
  if (updateData.description !== undefined) {
    expense.description = updateData.description;
  }
  if (updateData.notes !== undefined) {
    expense.notes = updateData.notes;
  }

  await expense.save();

  return expense.toJSON();
};

/**
 * Delete expense
 */
export const deleteExpense = async (expenseId, ownerId) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  // Verify ownership
  const property = await Property.findById(expense.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Expense not found');
  }

  await Expense.findByIdAndDelete(expenseId);

  return { message: 'Expense deleted successfully' };
};

/**
 * Get expense summary for property
 */
export const getExpenseSummary = async (ownerId, propertyId, fromMonth, toMonth) => {
  const property = await Property.findById(propertyId);
  if (!property) {
    throw new ApiError(404, 'Property not found');
  }

  if (property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Property not found');
  }

  // Parse month strings to date range
  const [fromYear, fromMon] = fromMonth.split('-').map(Number);
  const [toYear, toMon] = toMonth.split('-').map(Number);

  const fromDate = new Date(fromYear, fromMon - 1, 1);
  const toDate = new Date(toYear, toMon, 0); // Last day of toMonth

  // Property-level expenses
  const propertyExpenses = await Expense.find({
    property: propertyId,
    date: { $gte: fromDate, $lte: toDate },
  });

  // Room-level expenses
  const rooms = await Room.find({ property: propertyId });
  const roomIds = rooms.map(r => r._id);

  const roomExpenses = await Expense.find({
    property: propertyId,
    room: { $in: roomIds },
    date: { $gte: fromDate, $lte: toDate },
  });

  // Group by category
  const byCategory = {};
  [...propertyExpenses, ...roomExpenses].forEach((expense) => {
    if (!byCategory[expense.category]) {
      byCategory[expense.category] = {
        category: expense.category,
        totalAmount: 0,
        count: 0,
      };
    }
    byCategory[expense.category].totalAmount += expense.amount;
    byCategory[expense.category].count += 1;
  });

  // Group by room (simplified - just count rooms)
  const byRoom = {};
  roomExpenses.forEach((expense) => {
    if (!byRoom[expense.room.toString()]) {
      byRoom[expense.room.toString()] = {
        roomName: 'Room ' + (expense.room?.toString().slice(-2) || 'Unknown'),
        totalAmount: 0,
        count: 0,
      };
    }
    byRoom[expense.room.toString()].totalAmount += expense.amount;
    byRoom[expense.room.toString()].count += 1;
  });

  return {
    property: property.name,
    fromMonth,
    toMonth,
    propertyExpensesTotal: propertyExpenses.reduce((sum, e) => sum + e.amount, 0),
    roomExpensesTotal: roomExpenses.reduce((sum, e) => sum + e.amount, 0),
    grandTotal: propertyExpenses.reduce((sum, e) => sum + e.amount, 0) +
                roomExpenses.reduce((sum, e) => sum + e.amount, 0),
    byCategory: Object.values(byCategory),
    byRoom: Object.values(byRoom),
  };
};
