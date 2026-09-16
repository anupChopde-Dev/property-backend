# Property Management Backend

## Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start MongoDB (ensure MongoDB is running locally or update MONGODB_URI)

4. Run seed script to create demo data:
   ```bash
   npm run seed
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

Server runs on http://localhost:3001

## Demo Credentials

After running the seed script:
- **Email:** owner@example.com
- **Password:** password123

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- PUT /api/auth/profile

### Properties
- GET /api/properties
- POST /api/properties
- GET /api/properties/:id
- PUT /api/properties/:id
- DELETE /api/properties/:id
- GET /api/properties/:id/dashboard

### Rooms
- GET /api/properties/:propertyId/rooms
- POST /api/properties/:propertyId/rooms
- GET /api/rooms/:id
- PUT /api/rooms/:id
- GET /api/rooms/:roomId/electricity
- GET /api/rooms/:roomId/dashboard

### Tenants (Room Holders)
- GET /api/tenants
- POST /api/tenants
- GET /api/tenants/:id
- PUT /api/tenants/:id
- POST /api/tenants/:id/move-out
- GET /api/tenants/:id/members
- POST /api/tenants/:id/members
- PUT /api/tenant-members/:id
- DELETE /api/tenant-members/:id

### Rent
- GET /api/rent-charges
- POST /api/rent-charges
- GET /api/rent-charges/:id
- PUT /api/rent-charges/:id
- POST /api/rent-charges/:id/payments
- GET /api/rent-charges/:id/payments
- GET /api/tenants/:tenantId/rent-history

### Electricity
- GET /api/electricity
- POST /api/electricity/readings
- GET /api/electricity/readings/:id
- PUT /api/electricity/readings/:id
- GET /api/rooms/:roomId/electricity
- GET /api/electricity/previous-reading/:roomId/:billingMonth

### Expenses
- GET /api/expenses
- POST /api/expenses
- GET /api/expenses/:id
- PUT /api/expenses/:id
- DELETE /api/expenses/:id

### Documents
- POST /api/tenants/:tenantId/documents
- GET /api/tenants/:tenantId/documents
- DELETE /api/documents/:id
- GET /api/documents/:id/download

### Dashboard & Reports
- GET /api/dashboard
- GET /api/properties/:id/dashboard
- GET /api/reports/monthly
- GET /api/reports/rent
- GET /api/reports/outstanding-rent
- GET /api/reports/electricity
- GET /api/reports/expenses
