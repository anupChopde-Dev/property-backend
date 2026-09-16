import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { errorHandlerMiddleware, notFoundMiddleware, securityHeaders, requestLogger } from './middlewares/errorHandlerMiddleware.js';

import { authRoutes, propertyRoutes, roomRoutes, tenantRoutes, rentRoutes, electricityRoutes, expenseRoutes, documentRoutes, dashboardRoutes, reportsRoutes } from './routes/index.js';

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (development only)
app.use(requestLogger);

// Note: uploaded tenant documents live in ./uploads/documents and are private.
// They are served through the authenticated /api/documents/:id/file endpoint,
// so the uploads directory is intentionally NOT exposed as static files.

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api', rentRoutes);
app.use('/api', electricityRoutes);
app.use('/api', expenseRoutes);
app.use('/api', documentRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', reportsRoutes);

// 404 handler
app.use(notFoundMiddleware);

// Error handler
app.use(errorHandlerMiddleware);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Create uploads directories if they don't exist
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadsDir = path.resolve('./uploads');
    const docsDir = path.resolve('./uploads/documents');

    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.mkdir(docsDir, { recursive: true });
    } catch (dirError) {
      console.warn('Could not create uploads directories:', dirError.message);
    }

    // Start listening
    app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║     Property Management API Server                      ║
╠══════════════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(29)}║
║  Port: ${String(config.port).padEnd(33)}║
║  MongoDB: ${config.mongoUri.substring(0, 28).padEnd(33)}║
║  Storage: ${config.storage.provider.padEnd(33)}║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  // Close database connection
  // Perform cleanup
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
startServer();

export default app;
