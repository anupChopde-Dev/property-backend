# Property Rental & Room Management System

## Architecture Overview

### System Design

This is a **residential rental management application** for property owners managing multiple properties with individual rooms rented to tenants (room holders).

### Technology Stack

**Frontend:**
- Next.js (latest stable) with App Router
- React with JavaScript
- Tailwind CSS for styling
- shadcn/ui component library
- React Hook Form + Zod for forms/validation
- TanStack Query (React Query) for data fetching
- Mobile-first responsive design

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT authentication
- Zod validation
- S3-compatible storage (Cloudflare R2)

### Project Structure

```
property-management/
├── property-management-frontend/
│   └── src/
│       ├── app/              # Next.js App Router pages
│       ├── components/       # Reusable UI components
│       ├── features/         # Feature-based modules
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # Utilities, API client
│       ├── services/         # API service functions
│       ├── schemas/          # Zod validation schemas
│       ├── types/            # TypeScript types
│       ├── providers/        # Context providers
│       └── styles/           # Global styles
│
└── property-management-backend/
    └── src/
        ├── config/           # Environment, database config
        ├── controllers/      # Request handlers (thin)
        ├── services/         # Business logic
        ├── repositories/     # Data access layer
        ├── models/           # Mongoose models
        ├── routes/           # API route definitions
        ├── middlewares/      # Auth, error handling, etc.
        ├── validators/       # Zod validation schemas
        ├── utils/            # Helper functions
        ├── integrations/     # External integrations
        ├── storage/          # S3 storage service
        ├── jobs/             # Background jobs (future)
        └── types/            # TypeScript types
```

---

## Database Schema & Entity Relationships

### Core Models

```
User (Owner)
├── Properties (1:N)
│   └── Rooms (1:N)
│       ├── Tenant (current room holder)
│       │   └── TenantMembers (1:N)
│       │   └── TenantDocuments (max 2)
│       ├── RentCharges (1:N) - monthly rent records
│       │   └── RentPayments (1:N)
│       ├── ElectricityReadings (1:N) - monthly
│       └── Expenses (0:N) - room-level
│
├── ElectricityMeter (per room)
│
└── Expenses (1:N) - property-level
```

### Model Definitions

#### User
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String ( hashed),
  fullName: String,
  mobile: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Property
```javascript
{
  _id: ObjectId,
  owner: ObjectId (ref: User),
  name: String (required),
  address: String,
  city: String,
  state: String,
  pincode: String,
  description: String,
  notes: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

#### Room
```javascript
{
  _id: ObjectId,
  property: ObjectId (ref: Property),
  roomNumber: String (required),
  floor: String,
  monthlyRent: Number (default: 0),
  securityDeposit: Number (default: 0),
  status: String (VACANT | OCCUPIED | MAINTENANCE),
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Tenant (Room Holder)
```javascript
{
  _id: ObjectId,
  room: ObjectId (ref: Room),
  fullName: String (required),
  mobile: String,
  email: String,
  permanentAddress: String,
  occupation: String,
  joiningDate: Date,
  leavingDate: Date,
  status: String (ACTIVE | MOVED_OUT),
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### TenantMember (Household Member)
```javascript
{
  _id: ObjectId,
  tenant: ObjectId (ref: Tenant),
  name: String (required),
  relationship: String (required),
  dateOfBirth: Date,
  phone: String,
  notes: String,
  createdAt: Date
}
```

#### TenantDocument
```javascript
{
  _id: ObjectId,
  tenant: ObjectId (ref: Tenant),
  imageSlot: Number (1 | 2),
  originalFileName: String,
  mimeType: String,
  storageKey: String,
  size: Number,
  uploadedAt: Date
}
```

#### RentCharge (Monthly Rent Record)
```javascript
{
  _id: ObjectId,
  room: ObjectId (ref: Room),
  tenant: ObjectId (ref: Tenant),
  billingMonth: String (e.g., "2026-08"),
  rentAmount: Number (required),
  status: String (PENDING | PARTIAL | PAID | OVERDUE),
  dueDate: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### RentPayment
```javascript
{
  _id: ObjectId,
  rentCharge: ObjectId (ref: RentCharge),
  amount: Number (required),
  paymentDate: Date,
  paymentMethod: String (CASH | UPI | BANK_TRANSFER | CHEQUE | OTHER),
  referenceNumber: String,
  notes: String,
  createdAt: Date
}
```

#### ElectricityReading (Monthly)
```javascript
{
  _id: ObjectId,
  property: ObjectId (ref: Property),
  room: ObjectId (ref: Room),
  tenant: ObjectId (ref: Tenant),
  billingMonth: String (e.g., "2026-08"),
  previousReading: Number (required),
  currentReading: Number (required),
  consumedUnits: Number,
  ratePerUnit: Number (required),
  energyAmount: Number,
  fixedCharge: Number (default: 0),
  otherCharge: Number (default: 0),
  totalAmount: Number,
  readingDate: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Expense
```javascript
{
  _id: ObjectId,
  property: ObjectId (ref: Property),
  room: ObjectId (ref: Room, optional),
  category: String (REPAIR | MAINTENANCE | PLUMBING | ELECTRICAL | CLEANING | PAINTING | PROPERTY_TAX | OTHER),
  amount: Number (required),
  date: Date,
  description: String,
  notes: String,
  createdAt: Date
}
```

---

## API Specification

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new owner |
| POST | /api/auth/login | Login and get JWT |
| POST | /api/auth/logout | Logout (client-side token removal) |
| GET | /api/auth/me | Get current user |

### Properties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/properties | List all properties |
| POST | /api/properties | Create property |
| GET | /api/properties/:id | Get property details |
| PUT | /api/properties/:id | Update property |
| DELETE | /api/properties/:id | Delete/deactivate property |
| GET | /api/properties/:id/dashboard | Property dashboard data |

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/properties/:propertyId/rooms | List rooms in property |
| POST | /api/properties/:propertyId/rooms | Create room |
| GET | /api/rooms/:id | Get room details |
| PUT | /api/rooms/:id | Update room |
| GET | /api/rooms/:roomId/electricity | Room electricity history |

### Tenants (Room Holders)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tenants | List all tenants |
| POST | /api/tenants | Create tenant |
| GET | /api/tenants/:id | Get tenant details |
| PUT | /api/tenants/:id | Update tenant |
| GET | /api/tenants/:id/members | List household members |
| POST | /api/tenants/:id/members | Add member |
| PUT | /api/tenant-members/:id | Update member |
| DELETE | /api/tenant-members/:id | Remove member |

### Rent

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/rent-charges | List rent charges |
| POST | /api/rent-charges | Create rent charge |
| GET | /api/rent-charges/:id | Get rent charge details |
| POST | /api/rent-charges/:id/payments | Add payment |
| GET | /api/rent-charges/:id/payments | List payments |

### Electricity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/electricity | List electricity readings |
| POST | /api/electricity/readings | Create reading |
| GET | /api/electricity/readings/:id | Get reading |
| PUT | /api/electricity/readings/:id | Update reading |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/expenses | List expenses |
| POST | /api/expenses | Create expense |
| PUT | /api/expenses/:id | Update expense |
| DELETE | /api/expenses/:id | Delete expense |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tenants/:tenantId/documents | Upload document |
| GET | /api/tenants/:tenantId/documents | List documents |
| DELETE | /api/documents/:id | Delete document |
| GET | /api/documents/:id/download | Get signed download URL |

### Dashboard & Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Main dashboard data |
| GET | /api/reports/monthly | Monthly reports |
| GET | /api/reports/electricity | Electricity reports |
| GET | /api/reports/rent | Rent reports |
| GET | /api/reports/expenses | Expense reports |

---

## Frontend Route Structure

```
/                         -> Dashboard (main)
/login                    -> Login page
/register                 -> Register page

/properties               -> Properties list
/properties/new           -> Add property
/properties/[id]          -> Property detail/dashboard
/properties/[id]/edit     -> Edit property
/properties/[id]/rooms    -> Rooms in property
/properties/[id]/rooms/new  -> Add room

/rooms/[id]               -> Room detail dashboard
/rooms/[id]/tenants       -> Room tenant history
/rooms/[id]/rent          -> Room rent management
/rooms/[id]/electricity   -> Room electricity management
/rooms/[id]/expenses      -> Room expenses
/rooms/[id]/documents     -> Room holder documents

/tenants                  -> All tenants list
/tenants/[id]             -> Tenant detail
/tenants/[id]/members     -> Household members
/tenants/[id]/documents   -> Tenant documents

/monthly                  -> Monthly management page
/monthly/[month]          -> Specific month management

/reports                  -> Reports overview
/reports/rent             -> Rent reports
/reports/electricity      -> Electricity reports
/reports/expenses         -> Expense reports

/settings                 -> User settings
```

---

## UI/Page Structure

### Layout Components
- Sidebar navigation (desktop)
- Bottom navigation (mobile)
- Header with search and user menu
- Responsive breakpoints

### Key Pages

1. **Dashboard** - Overview cards, alerts, recent activity
2. **Property Management** - CRUD for properties
3. **Room Management** - Room list, status, details
4. **Tenant Management** - Tenant profiles, documents, members
5. **Monthly Management** - Quick entry for rent and electricity
6. **Reports** - Financial and consumption reports
7. **Settings** - User profile, preferences

### Component Categories

- **Forms**: PropertyForm, RoomForm, TenantForm, etc.
- **Tables**: PropertyTable, RoomTable, TenantTable (responsive)
- **Cards**: Dashboard cards, Room cards, Tenant cards
- **Modals/Dialogs**: Confirmation dialogs, quick actions
- **Charts**: Financial charts, consumption charts (future)

---

## Development Phases

### Phase 1: Project Setup + Authentication
- [ ] Create backend project structure
- [ ] Set up Express server with error handling
- [ ] Configure MongoDB connection
- [ ] Create User model
- [ ] Implement auth controllers (register, login, logout, me)
- [ ] Add JWT middleware and password hashing
- [ ] Create frontend project with Next.js
- [ ] Set up Tailwind CSS and shadcn/ui
- [ ] Create auth pages (login, register)
- [ ] Implement auth context and API client

### Phase 2: Properties + Rooms
- [ ] Create Property model
- [ ] Implement property CRUD APIs
- [ ] Create Room model
- [ ] Implement room CRUD APIs
- [ ] Build property list/detail pages
- [ ] Build room management UI

### Phase 3: Room Holders + Household Members
- [ ] Create Tenant model
- [ ] Create TenantMember model
- [ ] Implement tenant CRUD APIs
- [ ] Implement member CRUD APIs
- [ ] Build tenant profile pages
- [ ] Build household member management

### Phase 4: Rental History + Monthly Rent
- [ ] Create RentCharge model
- [ ] Create RentPayment model
- [ ] Implement rent charge APIs
- [ ] Implement payment APIs
- [ ] Build rent management UI

### Phase 5: Electricity Management
- [ ] Create ElectricityReading model
- [ ] Create ElectricityMeter model
- [ ] Implement electricity APIs
- [ ] Build electricity reading UI
- [ ] Implement validation and calculations

### Phase 6: Expenses
- [ ] Create Expense model
- [ ] Implement expense APIs
- [ ] Build expense management UI

### Phase 7: Document Management
- [ ] Set up S3 storage service
- [ ] Implement document upload APIs
- [ ] Build document UI with thumbnails

### Phase 8: Dashboard
- [ ] Implement dashboard API endpoints
- [ ] Build main dashboard UI
- [ ] Build property dashboard
- [ ] Build room dashboard

### Phase 9: Monthly Management
- [ ] Build monthly management page
- [ ] Implement quick entry forms
- [ ] Add month/property selectors

### Phase 10: Reports
- [ ] Implement report APIs
- [ ] Build report pages
- [ ] Add filtering and export

### Phase 11: Testing + Security + Polish
- [ ] Write unit tests for business logic
- [ ] Add rate limiting
- [ ] Add input sanitization
- [ ] Security audit
- [ ] Performance optimization

### Phase 12: Seed Data + Deployment Prep
- [ ] Create seed script
- [ ] Prepare environment files
- [ ] Deployment documentation

---

## Key Business Rules

### Electricity Calculation
```
consumedUnits = currentReading - previousReading
energyAmount = consumedUnits × ratePerUnit
totalAmount = energyAmount + fixedCharge + otherCharge
```

### Rent Status Calculation
```
totalPaid = sum(all payments for charge)
outstanding = rentAmount - totalPaid

Status Rules:
- totalPaid === 0 → PENDING
- totalPaid > 0 && totalPaid < rentAmount → PARTIAL
- totalPaid >= rentAmount → PAID
- dueDate passed && status !== PAID → OVERDUE
```

### Tenant History
- When tenant moves out: set leavingDate, update status to MOVED_OUT
- Set room status to VACANT
- New tenant creates new Tenant record (don't overwrite)

### Document Limits
- Maximum 2 documents per tenant (imageSlot: 1 or 2)
- Replacing document deletes old one

---

## Security Considerations

1. **Authentication**: JWT tokens with expiration
2. **Authorization**: All data filtered by ownerId from JWT
3. **Validation**: Zod schemas on all inputs
4. **Password**: bcrypt hashing with salt
5. **Storage**: Private S3 bucket, signed URLs only
6. **Headers**: Helmet for secure HTTP headers
7. **CORS**: Restricted to frontend origin
8. **Rate Limiting**: On auth endpoints especially

---

## Financial Distinctions

The system distinguishes between:

1. **Rent Income**: Money from room rent (income for owner)
2. **Electricity Charges**: Money charged to tenants (pass-through, not profit)
3. **Property Expenses**: Owner's spending on property
4. **Room Expenses**: Owner's spending on specific room

This allows accurate profit calculation:
```
Net Profit = Rent Income - Property Expenses - Room Expenses
```

Electricity charged to tenants is tracked separately from actual electricity costs paid by owner.

---

## Next Steps

Ready to begin with **Phase 1: Project Setup + Authentication**.

Shall I proceed with implementing the backend project structure first, or would you like to discuss any part of the architecture before starting?
