const express = require('express');
const cors = require('cors');
const { helmetConfig, apiLimiter, loginLimiter } = require('./middleware/securityMiddleware');
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

const privateLanOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}):\d+$/;

// Security headers
app.use(helmetConfig);

// CORS with LAN-friendly development access
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = new Set([
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ].filter(Boolean));

      if (allowedOrigins.has(origin) || privateLanOriginPattern.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
  })
);

// Body parser with size limits to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Global rate limiter for all API endpoints (applied after health check)
app.use('/api/', apiLimiter);

// Health check (no rate limit)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes with stricter rate limiting
app.use('/api/auth', loginLimiter, authRoutes);

// Regular API routes (admin/registrar only)
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  // Don't expose error details to client for security
  res.status(500).json({ message: 'Internal server error.' });
});

module.exports = app;
