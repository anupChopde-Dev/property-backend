import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config/index.js';
import {
  User,
  Property,
  Room,
  Tenant,
  TenantMember,
  TenantDocument,
  RentCharge,
  RentPayment,
  ElectricityReading,
  Expense,
} from './models/index.js';

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Property.deleteMany({}),
      Room.deleteMany({}),
      Tenant.deleteMany({}),
      TenantMember.deleteMany({}),
      TenantDocument.deleteMany({}),
      RentCharge.deleteMany({}),
      RentPayment.deleteMany({}),
      ElectricityReading.deleteMany({}),
      Expense.deleteMany({}),
    ]);
    console.log('Existing data cleared');

    // Create demo user
    const password = await bcrypt.hash('password123', 12);
    const demoUser = new User({
      email: 'owner@example.com',
      password,
      fullName: 'Rajesh Patel',
      mobile: '9876543210',
    });
    await demoUser.save();
    console.log('Demo user created: owner@example.com / password123');

    // Generate JWT token for demo user
    const token = jwt.sign(
      { userId: demoUser._id, email: demoUser.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Create properties
    const properties = [
      {
        owner: demoUser._id,
        name: 'Shree Apartment',
        address: '123, Adajan Gam',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395009',
        description: 'A well-maintained 5-story apartment building with modern amenities.',
        notes: 'Main property - highest revenue generator',
      },
      {
        owner: demoUser._id,
        name: 'Green House',
        address: '45, Society Road',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395007',
        description: 'Independent bungalow with garden space.',
        notes: 'Premium property',
      },
      {
        owner: demoUser._id,
        name: 'Patel Building',
        address: '78, Ring Road',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395006',
        description: 'Commercial-cum-residential building.',
        notes: 'Mixed-use property',
      },
    ];

    const savedProperties = await Property.insertMany(properties);
    console.log(`Created ${savedProperties.length} properties`);

    // Create rooms for each property
    const roomsData = [];

    // Shree Apartment - 5 rooms
    roomsData.push(
      { property: savedProperties[0]._id, roomNumber: '101', floor: '1', monthlyRent: 8000, securityDeposit: 16000, status: 'OCCUPIED' },
      { property: savedProperties[0]._id, roomNumber: '102', floor: '1', monthlyRent: 7500, securityDeposit: 15000, status: 'OCCUPIED' },
      { property: savedProperties[0]._id, roomNumber: '103', floor: '1', monthlyRent: 8000, securityDeposit: 16000, status: 'VACANT' },
      { property: savedProperties[0]._id, roomNumber: '201', floor: '2', monthlyRent: 9000, securityDeposit: 18000, status: 'OCCUPIED' },
      { property: savedProperties[0]._id, roomNumber: '202', floor: '2', monthlyRent: 8500, securityDeposit: 17000, status: 'MAINTENANCE' }
    );

    // Green House - 4 rooms
    roomsData.push(
      { property: savedProperties[1]._id, roomNumber: 'A', floor: 'Ground', monthlyRent: 10000, securityDeposit: 20000, status: 'OCCUPIED' },
      { property: savedProperties[1]._id, roomNumber: 'B', floor: 'Ground', monthlyRent: 9500, securityDeposit: 19000, status: 'OCCUPIED' },
      { property: savedProperties[1]._id, roomNumber: 'C', floor: 'First', monthlyRent: 11000, securityDeposit: 22000, status: 'VACANT' },
      { property: savedProperties[1]._id, roomNumber: 'D', floor: 'First', monthlyRent: 10500, securityDeposit: 21000, status: 'OCCUPIED' }
    );

    // Patel Building - 4 rooms
    roomsData.push(
      { property: savedProperties[2]._id, roomNumber: '1', floor: '1', monthlyRent: 7000, securityDeposit: 14000, status: 'OCCUPIED' },
      { property: savedProperties[2]._id, roomNumber: '2', floor: '1', monthlyRent: 7500, securityDeposit: 15000, status: 'OCCUPIED' },
      { property: savedProperties[2]._id, roomNumber: '3', floor: '2', monthlyRent: 8000, securityDeposit: 16000, status: 'VACANT' },
      { property: savedProperties[2]._id, roomNumber: '4', floor: '2', monthlyRent: 7500, securityDeposit: 15000, status: 'OCCUPIED' }
    );

    const savedRooms = await Room.insertMany(roomsData);
    console.log(`Created ${savedRooms.length} rooms`);

    // Create tenants and their data
    const tenantsData = [
      {
        room: savedRooms[0]._id, // 101 Shree Apartment
        fullName: 'Rahul Patel',
        mobile: '9998887776',
        email: 'rahul.patel@email.com',
        permanentAddress: '12, City Center, Surat',
        occupation: 'Business Owner',
        joiningDate: new Date('2024-06-01'),
        status: 'ACTIVE',
      },
      {
        room: savedRooms[1]._id, // 102 Shree Apartment
        fullName: 'Amit Sharma',
        mobile: '9876543210',
        email: 'amit.sharma@email.com',
        permanentAddress: '45, Old City, Surat',
        occupation: 'Teacher',
        joiningDate: new Date('2025-01-15'),
        status: 'ACTIVE',
      },
      {
        room: savedRooms[3]._id, // 201 Shree Apartment
        fullName: 'Priya Verma',
        mobile: '9765432109',
        email: 'priya.verma@email.com',
        permanentAddress: '78, New Town, Surat',
        occupation: 'Homemaker',
        joiningDate: new Date('2023-03-01'),
        status: 'ACTIVE',
      },
      {
        room: savedRooms[5]._id, // A Green House
        fullName: 'Raj Gupta',
        mobile: '9887766554',
        email: 'raj.gupta@email.com',
        permanentAddress: '90, Market Road, Surat',
        occupation: 'IT Professional',
        joiningDate: new Date('2025-06-01'),
        status: 'ACTIVE',
      },
      {
        room: savedRooms[6]._id, // B Green House
        fullName: 'Sneha Joshi',
        mobile: '9871234567',
        email: 'sneha.joshi@email.com',
        permanentAddress: '23, Park Avenue, Surat',
        occupation: 'Nurse',
        joiningDate: new Date('2024-09-01'),
        status: 'ACTIVE',
      },
      {
        room: savedRooms[7]._id, // D Green House
        fullName: 'Vikram Mehta',
        mobile: '9898989898',
        email: 'vikram.mehta@email.com',
        permanentAddress: '56, Lake View, Surat',
        occupation: 'Architect',
        joiningDate: new Date('2026-01-01'),
        status: 'ACTIVE',
      },
      {
        room: savedRooms[9]._id, // 1 Patel Building
        fullName: 'Anil Kumar',
        mobile: '9888877776',
        email: 'anil.kumar@email.com',
        permanentAddress: '34, Bus Stand Road, Surat',
        occupation: 'Driver',
        joiningDate: new Date('2024-07-15'),
        status: 'ACTIVE',
      },
      {
        room: savedRooms[10]._id, // 2 Patel Building
        fullName: 'Meena Devi',
        mobile: '9876549876',
        email: 'meena.devi@email.com',
        permanentAddress: '67, Railway Station Road, Surat',
        occupation: 'Shop Owner',
        joiningDate: new Date('2025-04-01'),
        status: 'ACTIVE',
      },
      {
        room: savedRooms[12]._id, // 4 Patel Building
        fullName: 'Rohan Nair',
        mobile: '9865432109',
        email: 'rohan.nair@email.com',
        permanentAddress: '89, Beach Road, Surat',
        occupation: 'Software Engineer',
        joiningDate: new Date('2025-11-01'),
        status: 'ACTIVE',
      },
    ];

    const savedTenants = await Tenant.insertMany(tenantsData);
    console.log(`Created ${savedTenants.length} tenants`);

    // Create household members for some tenants
    const membersData = [
      // Rahul Patel family (4 people)
      { tenant: savedTenants[0]._id, name: 'Rahul Patel', relationship: 'Primary' },
      { tenant: savedTenants[0]._id, name: 'Priya Patel', relationship: 'Spouse' },
      { tenant: savedTenants[0]._id, name: 'Aarav Patel', relationship: 'Son', dateOfBirth: new Date('2015-05-10') },
      { tenant: savedTenants[0]._id, name: 'Riya Patel', relationship: 'Daughter', dateOfBirth: new Date('2018-08-20') },

      // Priya Verma family (3 people)
      { tenant: savedTenants[2]._id, name: 'Priya Verma', relationship: 'Primary' },
      { tenant: savedTenants[2]._id, name: 'Vikram Verma', relationship: 'Spouse' },
      { tenant: savedTenants[2]._id, name: 'Ananya Verma', relationship: 'Daughter', dateOfBirth: new Date('2012-03-15') },

      // Raj Gupta (single)
      { tenant: savedTenants[3]._id, name: 'Raj Gupta', relationship: 'Primary' },

      // Sneha Joshi family (2 people)
      { tenant: savedTenants[4]._id, name: 'Sneha Joshi', relationship: 'Primary' },
      { tenant: savedTenants[4]._id, name: 'Deepak Joshi', relationship: 'Spouse' },
    ];

    const savedMembers = await TenantMember.insertMany(membersData);
    console.log(`Created ${savedMembers.length} household members`);

    // Create rent charges for current and previous months
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previousMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    const rentChargesData = [];

    // Current month rent charges for active tenants
    savedTenants.forEach((tenant, index) => {
      if (tenant.status === 'ACTIVE') {
        const room = savedRooms.find(r => r._id.toString() === tenant.room.toString());
        rentChargesData.push({
          room: tenant.room,
          tenant: tenant._id,
          billingMonth: currentMonth,
          rentAmount: room ? room.monthlyRent : 8000,
          status: 'PAID',
          dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5),
        });
      }
    });

    // Previous month - mix of statuses
    savedTenants.slice(0, 5).forEach((tenant, index) => {
      if (tenant.status === 'ACTIVE') {
        const room = savedRooms.find(r => r._id.toString() === tenant.room.toString());
        const status = index === 1 ? 'PARTIAL' : index === 2 ? 'PENDING' : 'PAID';
        const rentAmount = room ? room.monthlyRent : 8000;

        rentChargesData.push({
          room: tenant.room,
          tenant: tenant._id,
          billingMonth: previousMonth,
          rentAmount,
          status,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 5),
        });
      }
    });

    const savedRentCharges = await RentCharge.insertMany(rentChargesData);
    console.log(`Created ${savedRentCharges.length} rent charges`);

    // Create rent payments
    const rentPaymentsData = [];
    const nowDate = new Date();

    savedRentCharges.forEach((charge, index) => {
      if (charge.status !== 'PENDING') {
        const paymentAmount = charge.status === 'PAID' ? charge.rentAmount : Math.floor(charge.rentAmount * 0.5);
        rentPaymentsData.push({
          rentCharge: charge._id,
          amount: paymentAmount,
          paymentDate: new Date(nowDate.getFullYear(), nowDate.getMonth(), 25 - index),
          paymentMethod: index % 3 === 0 ? 'UPI' : index % 3 === 1 ? 'CASH' : 'BANK_TRANSFER',
          referenceNumber: `TXN${Date.now()}${index}`,
        });
      }
    });

    await RentPayment.insertMany(rentPaymentsData);
    console.log(`Created ${rentPaymentsData.length} rent payments`);

    // Create electricity readings for current month
    const electricityReadingsData = [];

    const roomsWithTenants = savedRooms.filter(r => r.status === 'OCCUPIED');
    roomsWithTenants.forEach((room, index) => {
      const tenant = savedTenants.find(t => t.room.toString() === room._id.toString());
      if (tenant) {
        const previousReading = 1000 + index * 200 + Math.floor(Math.random() * 100);
        const currentReading = previousReading + 100 + Math.floor(Math.random() * 50);

        electricityReadingsData.push({
          property: room.property,
          room: room._id,
          tenant: tenant._id,
          billingMonth: currentMonth,
          previousReading,
          currentReading,
          consumedUnits: currentReading - previousReading,
          ratePerUnit: 8,
          energyAmount: (currentReading - previousReading) * 8,
          fixedCharge: 50,
          otherCharge: 20,
          totalAmount: ((currentReading - previousReading) * 8) + 50 + 20,
          readingDate: new Date(nowDate.getFullYear(), nowDate.getMonth(), 28 - index),
        });
      }
    });

    await ElectricityReading.insertMany(electricityReadingsData);
    console.log(`Created ${electricityReadingsData.length} electricity readings`);

    // Create sample expenses
    const expensesData = [
      {
        property: savedProperties[0]._id,
        category: 'REPAIR',
        amount: 5000,
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        description: 'Bathroom fixture repair - Room 102',
        notes: 'Faucet replacement',
      },
      {
        property: savedProperties[0]._id,
        room: savedRooms[1]._id, // Room 102
        category: 'ELECTRICAL',
        amount: 800,
        date: new Date(now.getFullYear(), now.getMonth(), 10),
        description: 'LED light fixture installation',
        notes: 'Changed to energy-efficient LEDs',
      },
      {
        property: savedProperties[1]._id,
        category: 'CLEANING',
        amount: 2000,
        date: new Date(now.getFullYear(), now.getMonth(), 15),
        description: 'Common area deep cleaning',
        notes: 'Monthly cleaning service',
      },
      {
        property: savedProperties[1]._id,
        room: savedRooms[5]._id, // Room D
        category: 'PLUMBING',
        amount: 1500,
        date: new Date(now.getFullYear(), now.getMonth(), 18),
        description: 'Sink replacement',
        notes: 'Old sink damaged',
      },
      {
        property: savedProperties[2]._id,
        category: 'PROPERTY_TAX',
        amount: 12000,
        date: new Date(now.getFullYear(), now.getMonth(), 1),
        description: 'Annual property tax payment',
        notes: 'Municipal corporation tax',
      },
    ];

    await Expense.insertMany(expensesData);
    console.log(`Created ${expensesData.length} expenses`);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║            SEED DATA CREATED SUCCESSFULLY               ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Demo User: ${'owner@example.com'.padEnd(22)}║`);
    console.log(`║  Password: ${'password123'.padEnd(23)}║`);
    console.log(`║  JWT Token: ${token.substring(0, 28) + '...'.padEnd(24)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('Quick API test URLs:');
    console.log('  GET  http://localhost:3001/api/health');
    console.log('  POST http://localhost:3001/api/auth/login');
    console.log('  GET  http://localhost:3001/api/dashboard');

    await mongoose.disconnect();
    console.log('\nMongoDB disconnected');
    process.exit(0);

  } catch (error) {
    console.error('Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedData();
