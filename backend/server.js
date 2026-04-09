require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

// ─── Connect Database ─────────────────────────────────────────────
connectDB();

// ─── Security Middleware ──────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── CRITICAL: Pre-load ALL Mongoose models before routes ─────────
// This prevents "Student.find is not a function" / "model not registered"
// errors caused by require() caching issues with nodemon on Windows.
// Models must be registered with Mongoose BEFORE any route handler runs.
require('./models/Student');
require('./models/Class');
require('./models/TeacherVolunteer');
require('./models/Attendance');
require('./models/Settings');
require('./models/Notification');
require('./models/Sequence');
require('./models/Staging');
require('./models/User');

// ─── API Routes (loaded AFTER models) ─────────────────────────────
const routes = require('./routes/index');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '🚀 VBS Backend Running',
    service: 'VBS Management System',
    version: '1.0.0'
  });
});

app.get('/api-info', (req, res) => {
  res.json({
    baseUrl: '/api',
    endpoints: [
      '/auth',
      '/students',
      '/teachers',
      '/classes',
      '/attendance'
    ]
  });
});

// ─── Health Check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: 'VBS Management System - Presence of Jesus Ministry',
  });
});

app.get('/ping', (req, res) => res.send('pong'));
// ─── Error Handling ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 VBS Management System running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🏠 Health: /health`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
