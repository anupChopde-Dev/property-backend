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
- **Password:** Anup@000

## Tenant Photo

Each tenant has **one photo**, stored as a Buffer inside the tenant document in
MongoDB (no external storage to pay for, no files to clean up).

### Uploading
`POST /api/tenants` and `PUT /api/tenants/:id` accept either JSON or `multipart/form-data`:
- Multipart: send one image file on `photo` (also accepted: `image`, `avatar`, `picture`, `file`).
- JSON: send a data URL or raw base64, e.g. `{ "photo": "data:image/png;base64,...." }`.

Only the first image is used. Allowed types/`MAX_FILE_SIZE` come from `.env` (default 5MB, jpeg/png).

### Reading
Tenant payloads (`GET /api/tenants`, `GET /api/tenants/:id`, `GET /api/rooms/:id`,
`GET /api/rooms/:id/dashboard` history) include:

```json
{ "hasPhoto": true, "photoUrl": "http://localhost:3001/api/tenants/<tenantId>/photo" }
```

The buffer itself is never sent in JSON. `GET /api/tenants/:id/photo` streams the image;
append the JWT because `<img>` cannot send headers:

```jsx
{tenant.hasPhoto && (
  <img src={`${tenant.photoUrl}?token=${token}`} alt={tenant.fullName} />
)}
```

Open the same URL (with `?token=`) on the tenant detail page to show the full-size photo.

### Tenant documents (optional, older feature)
The separate 2-slot document endpoints are unchanged and store files under the
project folder `uploads/documents/` (served through the authenticated API, not
as static files):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tenants/:tenantId/documents | Upload/replace one slot (`imageSlot` + file field) |
| GET | /api/tenants/:tenantId/documents | List documents (with thumbnail URLs) |
| GET | /api/documents/:id/file | Stream image inline, `?download=1` forces download |
| GET | /api/documents/:id/download | JSON download URL |
| DELETE | /api/documents/:id | Delete document |

Set `API_BASE_URL` in `.env` when the API is not reached at `http://localhost:<PORT>`.







