import { Tenant, TenantMember, TenantDocument, Room, Property } from '../models/index.js';
import { ApiError } from '../utils/errorHandler.js';

/**
 * Create a tenant (room holder)
 */
export const createTenant = async (ownerId, tenantData, photoPayload) => {
  const { room, fullName, mobile, email, permanentAddress, occupation, joiningDate, notes } = tenantData;

  // Verify room ownership
  const roomDoc = await Room.findById(room);
  if (!roomDoc) {
    throw new ApiError(404, 'Room not found');
  }

  const property = await Property.findOne({ _id: roomDoc.property, owner: ownerId });
  if (!property) {
    throw new ApiError(404, 'Room not found');
  }

  // Check if room is occupied
  const existingTenant = await Tenant.findOne({ room, status: 'ACTIVE' });
  if (existingTenant) {
    throw new ApiError(400, 'Room is already occupied. Move out current tenant first.');
  }

  const tenant = new Tenant({
    ...tenantData,
    room,
    ...(photoPayload ? { photo: photoPayload } : {}),
  });

  await tenant.save();

  // Update room status to OCCUPIED
  roomDoc.status = 'OCCUPIED';
  await roomDoc.save();

  return tenant.toJSON();
};

/**
 * Get all tenants
 */
export const getTenants = async (ownerId, filters = {}) => {
  const { status, propertyId, search } = filters;

  let query = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by property
  if (propertyId) {
    const property = await Property.findOne({ _id: propertyId, owner: ownerId });
    if (!property) {
      throw new ApiError(404, 'Property not found');
    }
    query.room = { $in: await Room.find({ property: propertyId }).distinct('_id') };
  }

  // Search by name or mobile
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
    ];
  }

  const tenants = await Tenant.find(query)
    .sort({ joiningDate: -1 })
    .lean();

  // Populate room and property info
  const populatedTenants = await Promise.all(
    tenants.map(async (tenant) => {
      const room = await Room.findById(tenant.room);
      const property = room ? await Property.findById(room.property) : null;
      const memberCount = await TenantMember.countDocuments({ tenant: tenant._id, isActive: true });

      return {
        ...tenant,
        roomName: room ? room.roomNumber : null,
        propertyName: property ? property.name : null,
        memberCount,
      };
    })
  );

  return populatedTenants;
};

/**
 * Get tenant by ID
 */
export const getTenantById = async (tenantId, ownerId) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }

  // Verify ownership through room and property
  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Tenant not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Tenant not found');
  }

  // Populate room info
  const populatedTenant = await Tenant.findById(tenantId).populate({
    path: 'room',
    select: 'roomNumber floor status',
  }).populate({
    path: 'room',
    select: 'property',
    populate: {
      path: 'property',
      select: 'name city',
    },
  });

  return populatedTenant.toJSON();
};

/**
 * Update tenant
 */
export const updateTenant = async (tenantId, ownerId, updateData) => {
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

  // If status is changing to MOVED_OUT, update leaving date and room status
  if (updateData.status === 'MOVED_OUT' && tenant.status === 'ACTIVE') {
    tenant.leavingDate = new Date();
    tenant.status = 'MOVED_OUT';

    // Update room status to VACANT
    room.status = 'VACANT';
    await room.save();
  } else {
    // Update other fields
    if (updateData.fullName !== undefined) tenant.fullName = updateData.fullName;
    if (updateData.mobile !== undefined) tenant.mobile = updateData.mobile;
    if (updateData.email !== undefined) tenant.email = updateData.email;
    if (updateData.permanentAddress !== undefined) tenant.permanentAddress = updateData.permanentAddress;
    if (updateData.occupation !== undefined) tenant.occupation = updateData.occupation;
    if (updateData.joiningDate !== undefined) tenant.joiningDate = new Date(updateData.joiningDate);
    if (updateData.notes !== undefined) tenant.notes = updateData.notes;
    if (updateData.status !== undefined) tenant.status = updateData.status;
  }

  await tenant.save();
  return tenant.toJSON();
};

/**
 * Move out tenant (specific action)
 */
export const moveOutTenant = async (tenantId, ownerId) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found');
  }

  if (tenant.status !== 'ACTIVE') {
    throw new ApiError(400, 'Tenant is already moved out');
  }

  // Verify ownership
  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Room not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Tenant not found');
  }

  tenant.leavingDate = new Date();
  tenant.status = 'MOVED_OUT';
  await tenant.save();

  // Update room status
  room.status = 'VACANT';
  await room.save();

  return tenant.toJSON();
};

/**
 * Get tenant household members
 */
export const getTenantMembers = async (tenantId, ownerId) => {
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

  const members = await TenantMember.find({ tenant: tenantId, isActive: true });
  return members.map(m => m.toJSON());
};

/**
 * Add household member
 */
export const addTenantMember = async (tenantId, ownerId, memberData) => {
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

  if (tenant.status !== 'ACTIVE') {
    throw new ApiError(400, 'Can only add members to active tenants');
  }

  const member = new TenantMember({
    ...memberData,
    tenant: tenantId,
  });

  await member.save();
  return member.toJSON();
};

/**
 * Update household member
 */
export const updateTenantMember = async (memberId, ownerId, updateData) => {
  const member = await TenantMember.findById(memberId);
  if (!member) {
    throw new ApiError(404, 'Member not found');
  }

  // Verify ownership
  const tenant = await Tenant.findById(member.tenant);
  if (!tenant) {
    throw new ApiError(404, 'Member not found');
  }

  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Member not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Member not found');
  }

  Object.assign(member, updateData);
  await member.save();

  return member.toJSON();
};

/**
 * Delete/Remove household member
 */
export const removeTenantMember = async (memberId, ownerId) => {
  const member = await TenantMember.findById(memberId);
  if (!member) {
    throw new ApiError(404, 'Member not found');
  }

  // Verify ownership
  const tenant = await Tenant.findById(member.tenant);
  if (!tenant) {
    throw new ApiError(404, 'Member not found');
  }

  const room = await Room.findById(tenant.room);
  if (!room) {
    throw new ApiError(404, 'Member not found');
  }

  const property = await Property.findById(room.property);
  if (!property || property.owner.toString() !== ownerId) {
    throw new ApiError(404, 'Member not found');
  }

  await TenantMember.findByIdAndDelete(memberId);

  return { message: 'Member removed successfully' };
};
