const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const corsOptions = require('./config/cors');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const routes = require('./routes');

const app = express();

// Trust Nginx reverse proxy (required for express-rate-limit behind Nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));

// CORS
app.use(cors(corsOptions));

// Body parsing — webhook route needs raw body, so we handle it specially.
// The payment webhook route uses its own express.raw() middleware.
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') {
    next(); // Skip JSON parsing for webhook
  } else {
    express.json({ limit: '10kb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting
app.use('/api', apiLimiter);

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
