// Validate that a dbName param exists in databases config
const { loadConfig } = require('../config/db');

function validateDb(req, res, next) {
  const { dbName } = req.params;

  if (!dbName) {
    return res.status(400).json({
      success: false,
      error: 'Database name parameter is required',
      code: 'VALIDATION_ERROR',
    });
  }

  const config = loadConfig();
  const db = config.databases.find((d) => d.name === dbName);

  if (!db) {
    return res.status(404).json({
      success: false,
      error: 'Database \'' + dbName + '\' is not configured',
      code: 'DB_NOT_FOUND',
    });
  }

  // Attach resolved db config for downstream use
  req.dbConfig = db;
  next();
}

module.exports = validateDb;
