require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/category');
const adminCategoryRoutes = require('./routes/adminCategory');
const fcmRoutes = require('./routes/fcm');
const catalogRoutes = require('./routes/catalog');

// Import config
const { connectDB } = require('./config/database');
const { initializeRealtimeServer } = require('./config/realtime');

const app = express();

// Middleware
app.use(helmet()); // Security headers

// CORS configuration - Environment-aware
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://www.iraagritech.com',
  'https://iraagritech.com'
];

// Clean up environment origins (remove trailing slashes)
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim().replace(/\/$/, ''))
  : [];

const allowedOrigins = [...envOrigins, ...defaultOrigins];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Normalize incoming origin (remove trailing slash just in case)
    const normalizedOrigin = origin.replace(/\/$/, '');

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedOrigin === normalizedAllowed;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    // In development, allow localhost origins
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = normalizedOrigin.startsWith('http://localhost:') || normalizedOrigin.startsWith('http://127.0.0.1:');
      if (isLocalhost) {
        return callback(null, true);
      }
    }

    // If not allowed, log and reject
    console.warn(`Blocked by CORS: ${normalizedOrigin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
})); // Enable CORS

app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Noor E Adah Backend Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Import error handler
const errorHandler = require('./middleware/errorHandler');

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/fcm', fcmRoutes);
app.use('/api/catalog', catalogRoutes);

// 404 handler (must come before error handler)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Server setup
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Connect to MongoDB
connectDB()
  .then(() => {
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 Noor E Adah Backend Server running on http://${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 MongoDB: ${process.env.MONGO_URI ? 'Connected' : 'Not configured'}`);
    });

    // Initialize real-time server (WebSocket/SSE) for push notifications
    initializeRealtimeServer(server);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');

      server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed');
          process.exit(0);
        });
      });
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

module.exports = app;
