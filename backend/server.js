require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// ─── Critical: Validate required environment variables at startup ──
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'FRONTEND_URL'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

// ─── Connect Database ─────────────────────────────────────────────
connectDB();

// ─── Security Middleware ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────
const getAllowedOrigins = () => {
  const origins = [];
  if (process.env.FRONTEND_URL) {
    try {
      const url = new URL(process.env.FRONTEND_URL);
      origins.push(url.origin);
    } catch {
      console.error('❌ FRONTEND_URL is not a valid URL:', process.env.FRONTEND_URL);
      process.exit(1);
    }
  }
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return origins;
};

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        return callback(new Error('Origin header required in production'));
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────────────────
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: (req) =>
      process.env.NODE_ENV === 'production' &&
      req.path.startsWith('/api/auth'),
  })
);

// ─── CRITICAL: Pre-load ALL Mongoose models before routes ─────────
require('./models/Student');
require('./models/Class');
require('./models/TeacherVolunteer');
require('./models/Attendance');
require('./models/Settings');
require('./models/Notification');
require('./models/Sequence');
require('./models/Staging');
require('./models/User');
require('./models/QRSession');

// ─── API Routes (loaded AFTER models) ─────────────────────────────
const routes = require('./routes/index');
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '🚀 VBS Backend Running',
    service: 'VBS Management System',
    version: '1.0.0',
  });
});

// ─── Health Check ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: 'VBS Management System',
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
  console.log(`📱 QR Attendance: /api/qr-attendance`);
  console.log(`🔐 Allowed origins: ${allowedOrigins.join(', ')}`);

  // FIX: Start attendance reminder job AFTER server is up
  // Only run in non-Vercel environments (Vercel is stateless/serverless)
  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    const { startAttendanceReminderJob } = require('./controllers/attendanceReminderJob');
    startAttendanceReminderJob();
  }
});

// ─── Graceful Shutdown ─────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully`);

  // Stop reminder job first
  try {
    const { stopAttendanceReminderJob } = require('./controllers/attendanceReminderJob');
    stopAttendanceReminderJob();
  } catch { /* ignore if not loaded */ }

  server.close(() => {
    console.log('✅ HTTP server closed');
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
