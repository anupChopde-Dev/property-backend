// READ-ONLY diagnostic against the real database on a temporary port.
process.env.PORT = '4998';
process.env.MONGODB_URI = 'mongodb://localhost:27017/property-management';

import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const { connectDatabase } = await import('./src/config/database.js');
const { config } = await import('./src/config/index.js');
const { User, Property, Room, Tenant } = await import('./src/models/index.js');
const routes = await import('./src/routes/index.js');
const { errorHandlerMiddleware } = await import('./src/middlewares/errorHandlerMiddleware.js');

await connectDatabase();

const app = express();
app.use(express.json());
app.use('/api/tenants', routes.tenantRoutes);
app.use('/api', routes.documentRoutes);
app.use('/api', routes.roomRoutes);
app.use('/api', routes.propertyRoutes);
app.use(errorHandlerMiddleware);
const server = app.listen(4998);

const base = 'http://localhost:4998';
const user = await User.findOne({ email: 'anupchopde06@gmail.com' });
const token = jwt.sign({ userId: user._id.toString(), email: user.email }, config.jwt.secret);
const auth = { Authorization: `Bearer ${token}` };

const properties = await Property.find({ owner: user._id }).limit(3);
console.log('owner:', user.email, '| properties:', properties.length);

// exactly what the frontend history modal calls
for (const property of properties) {
  const res = await fetch(`${base}/api/tenants?propertyId=${property._id}`, { headers: auth });
  const json = await res.json();
  console.log(`\nGET /api/tenants?propertyId=${property._id}  (${property.name}) -> ${res.status}`);
  for (const t of json.data || []) {
    console.log(
      JSON.stringify({ fullName: t.fullName, room: String(t.room), hasPhoto: t.hasPhoto, photoUrl: t.photoUrl, hasRawPhoto: !!t.photo })
    );
  }
}

// tenant detail + photo bytes
const withPhoto = await Tenant.findOne({ 'photo.data': { $exists: true, $ne: null } });
if (withPhoto) {
  const detail = await (await fetch(`${base}/api/tenants/${withPhoto._id}`, { headers: auth })).json();
  console.log('\nGET /api/tenants/' + withPhoto._id + ' ->', JSON.stringify({ fullName: detail.data?.fullName, hasPhoto: detail.data?.hasPhoto, photoUrl: detail.data?.photoUrl }));
  const photoRes = await fetch(`${base}/api/tenants/${withPhoto._id}/photo?token=${encodeURIComponent(token)}`);
  const bytes = Buffer.from(await photoRes.arrayBuffer());
  console.log('GET /api/tenants/:id/photo ->', photoRes.status, photoRes.headers.get('content-type'), bytes.length, 'bytes');
}

server.close();
await mongoose.disconnect();
