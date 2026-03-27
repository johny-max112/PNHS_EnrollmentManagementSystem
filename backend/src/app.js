const express = require('express');
const cors = require('cors');
const { helmetConfig, apiLimiter, loginLimiter } = require('./middleware/securityMiddleware');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const authRoutes = require('./routes/authRoutes');
const studentAuthRoutes = require('./routes/studentAuthRoutes');
const studentRoutes = require('./routes/studentRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security headers
app.use(helmetConfig);

// CORS with restricted origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.use('/api/student-auth', loginLimiter, studentAuthRoutes);

// Regular API routes
app.use('/api/student', studentRoutes);
app.use('/api/enroll', enrollmentRoutes);
app.use('/api/workflow', workflowRoutes);
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
