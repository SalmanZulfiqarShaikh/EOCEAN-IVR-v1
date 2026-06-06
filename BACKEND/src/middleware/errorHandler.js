// Centralized Express error handler
// All async errors that reach here are caught and formatted uniformly.

function errorHandler(err, req, res, _next) {
  console.error('[ERROR] ' + req.method + ' ' + req.originalUrl + ':', err.message);

  // MySQL / connection errors
  if (err.message && err.message.startsWith('Failed to connect')) {
    return res.status(502).json({
      success: false,
      error: err.message,
      code: 'DB_CONNECTION_ERROR',
    });
  }

  // Database not found
  if (err.message && err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: err.message,
      code: 'NOT_FOUND',
    });
  }

  // Validation errors
  if (err.message && err.message.startsWith('Validation')) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Config / file errors
  if (err.message && err.message.startsWith('Failed to parse config')) {
    return res.status(500).json({
      success: false,
      error: err.message,
      code: 'CONFIG_ERROR',
    });
  }

  // Default -- internal server error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;
