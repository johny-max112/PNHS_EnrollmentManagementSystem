const express = require('express');
const cors = require('cors');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const authRoutes = require('./routes/authRoutes');
const studentAuthRoutes = require('./routes/studentAuthRoutes');
const studentRoutes = require('./routes/studentRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/student-auth', studentAuthRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/enroll', enrollmentRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

module.exports = app;
