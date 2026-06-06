// Request handling for DB management APIs
// No SQL here. All business logic in dbService.
const dbService = require('../services/dbService');

async function getAll(req, res) {
  const databases = await dbService.listDatabases();
  res.json({ success: true, data: databases });
}

async function removeDatabase(req, res) {
  const { name } = req.params;
  const result = await dbService.removeDatabase(name);
  res.json({ success: true, data: result });
}

async function getServers(req, res) {
  const servers = await dbService.listServers();
  res.json({ success: true, data: servers });
}

async function addServer(req, res) {
  const { host = '127.0.0.1', port, user, password, label } = req.body;
  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'Username is required',
      code: 'VALIDATION_ERROR',
    });
  }
  const result = await dbService.addServer(host, port, user, password, label);
  res.json({ success: true, data: result });
}

async function removeServer(req, res) {
  const { host, port, user } = req.params;
  const result = await dbService.removeServer(host, port, user);
  res.json({ success: true, data: result });
}

async function syncAll(req, res) {
  const result = await dbService.syncAll();
  res.json({ success: true, data: result });
}

async function getTables(req, res) {
  const { dbName } = req.params;
  const tables = await dbService.getTables(dbName);
  res.json({ success: true, data: tables });
}

async function getTableData(req, res) {
  const { dbName, table } = req.params;
  const limit = parseInt(req.query.limit, 10) || 2000;
  const offset = parseInt(req.query.offset, 10) || 0;
  const result = await dbService.getTableData(dbName, table, limit, offset);
  res.json({ success: true, data: result });
}

async function getTableStructure(req, res) {
  const { dbName, table } = req.params;
  const structure = await dbService.getTableStructure(dbName, table);
  res.json({ success: true, data: structure });
}

async function searchTable(req, res) {
  const { dbName, table } = req.params;
  const term = req.query.q || '';
  const limit = parseInt(req.query.limit, 10) || 2000;
  if (!term) {
    return getTableData(req, res);
  }
  const result = await dbService.searchTable(dbName, table, term, limit);
  res.json({ success: true, data: result });
}

async function updateRow(req, res) {
  const { dbName, table } = req.params;
  const { old: oldRow, new: newRow } = req.body;
  if (!oldRow || !newRow) {
    return res.status(400).json({
      success: false,
      error: 'Both "old" and "new" row objects are required',
      code: 'VALIDATION_ERROR',
    });
  }
  const result = await dbService.updateRow(dbName, table, oldRow, newRow);
  res.json({ success: true, data: result });
}

async function deleteRow(req, res) {
  const { dbName, table } = req.params;
  const { row } = req.body;
  if (!row) {
    return res.status(400).json({
      success: false,
      error: '"row" object is required',
      code: 'VALIDATION_ERROR',
    });
  }
  const result = await dbService.deleteRow(dbName, table, row);
  res.json({ success: true, data: result });
}

module.exports = {
  getAll,
  removeDatabase,
  getServers,
  addServer,
  removeServer,
  syncAll,
  getTables,
  getTableData,
  getTableStructure,
  searchTable,
  updateRow,
  deleteRow,
};
