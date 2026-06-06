// Express application entry point
// Sets up middleware, routes, error handling, and starts the server.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const databaseRoutes = require('./routes/databaseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const recordingRoutes = require('./routes/recordingRoutes');
const metabaseRoutes = require('./routes/metabaseRoutes');
const errorHandler = require('./middleware/errorHandler');
const { loadConfig } = require('./config/db');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;

// Middleware stack
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }
    const allowedOrigins = [process.env.CORS_ORIGIN];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

// API routes
app.use('/api', databaseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/metabase', metabaseRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
function start() {
  const config = loadConfig();
  console.log('');
  console.log('Robocall Analytics - Backend');
  console.log('Servers configured: ' + config.servers.length);
  console.log('Databases loaded:   ' + config.databases.length);
  console.log('Running at: http://localhost:' + PORT);
  console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('');

  app.listen(PORT);
}

start();

module.exports = app;
