// All database management business logic
// SQL only belongs here. Used by databaseController.
const { loadConfig, saveConfig, getConnection, serverConnection } = require('../config/db');
const { getMockTables, getMockTableData, getMockTableStructure } = require('./mockData');

const SYSTEM_DBS = new Set(['information_schema', 'mysql', 'performance_schema', 'sys']);
const IS_MOCK = process.env.MOCK_MODE === 'true';

// List all configured databases (name + dbname only)
async function listDatabases() {
  const config = loadConfig();
  return config.databases.map((d) => ({ name: d.name, dbname: d.dbname }));
}

// List all configured servers (without passwords)
async function listServers() {
  const config = loadConfig();
  return config.servers.map((s) => ({
    host: s.host,
    port: parseInt(s.port, 10) || 3306,
    user: s.user,
    label: s.label || s.host,
  }));
}

// Remove a database from config (does NOT touch actual MySQL)
async function removeDatabase(name) {
  const config = loadConfig();
  const before = config.databases.length;
  config.databases = config.databases.filter((d) => d.name !== name);
  if (config.databases.length === before) {
    throw new Error('Database \'' + name + '\' not found');
  }
  saveConfig(config);
  return { removed: name };
}

// Remove a server and all its databases from config
async function removeServer(host, port, user) {
  const config = loadConfig();
  const portNum = parseInt(port, 10) || 3306;

  config.servers = config.servers.filter(
    (s) => !(s.host === host && parseInt(s.port, 10) === portNum && s.user === user)
  );
  config.databases = config.databases.filter(
    (d) => !(d.host === host && parseInt(d.port, 10) === portNum && d.user === user)
  );
  saveConfig(config);
  return { removed: true };
}

// Connect to a MySQL server, auto-detect all non-system databases
// Saves server creds and adds newly found databases to config
async function addServer(host, port, user, password, label) {
  const portNum = parseInt(port, 10) || 3306;
  const server = { host, port: portNum, user, password, label: label || host };

  // Test the connection and discover databases
  let allDbs;
  try {
    const conn = await serverConnection(server);
    const [rows] = await conn.query('SHOW DATABASES');
    allDbs = rows.map((r) => r.Database).filter((db) => !SYSTEM_DBS.has(db));
    await conn.end();
  } catch (err) {
    throw new Error('Connection failed: ' + err.message);
  }

  const config = loadConfig();

  // Save server if not already present
  const existingServer = config.servers.find(
    (s) => s.host === host && parseInt(s.port, 10) === portNum && s.user === user
  );
  if (!existingServer) {
    config.servers.push(server);
  }

  // Add new databases
  const added = [];
  for (const dbname of allDbs) {
    const exists = config.databases.find(
      (d) => d.dbname === dbname && d.host === host
    );
    if (!exists) {
      config.databases.push({
        name: dbname,
        host,
        port: portNum,
        dbname,
        user,
        password,
      });
      added.push(dbname);
    }
  }

  saveConfig(config);
  return { added, total_found: allDbs.length };
}

// Re-scan all saved servers for new/removed databases
async function syncAll() {
  const config = loadConfig();
  const totalAdded = [];
  const totalRemoved = [];
  const errors = [];

  for (const server of config.servers) {
    try {
      const conn = await serverConnection(server);
      const [rows] = await conn.query('SHOW DATABASES');
      const liveDbs = new Set(
        rows.map((r) => r.Database).filter((db) => !SYSTEM_DBS.has(db))
      );
      await conn.end();

      const existingDbnames = new Set(
        config.databases
          .filter(
            (d) =>
              d.host === server.host &&
              parseInt(d.port, 10) === parseInt(server.port, 10)
          )
          .map((d) => d.dbname)
      );

      // Add newly discovered DBs
      for (const dbname of liveDbs) {
        if (!existingDbnames.has(dbname)) {
          config.databases.push({
            name: dbname,
            host: server.host,
            port: parseInt(server.port, 10) || 3306,
            dbname,
            user: server.user,
            password: server.password,
          });
          totalAdded.push(dbname);
        }
      }

      // Remove DBs that no longer exist on this server
      const before = config.databases.length;
      config.databases = config.databases.filter(
        (d) =>
          !(
            d.host === server.host &&
            parseInt(d.port, 10) === parseInt(server.port, 10) &&
            !liveDbs.has(d.dbname)
          )
      );
      const removedCount = before - config.databases.length;
      if (removedCount > 0) {
        totalRemoved.push(removedCount + ' from ' + server.host);
      }
    } catch (err) {
      errors.push(server.host + ': ' + err.message);
    }
  }

  saveConfig(config);
  return {
    added: totalAdded,
    removed: totalRemoved,
    errors,
    total_databases: config.databases.length,
  };
}

// List tables in a database
async function getTables(dbName) {
  if (IS_MOCK) return getMockTables();
  const conn = await getConnection(dbName);
  try {
    const [rows] = await conn.query('SHOW TABLES');
    const key = Object.keys(rows[0] || {})[0];
    return rows.map((r) => r[key]);
  } finally {
    conn.release();
  }
}

// Get table data with pagination
async function getTableData(dbName, tableName, limit, offset) {
  if (IS_MOCK) return getMockTableData(tableName, limit, offset);
  const conn = await getConnection(dbName);
  try {
    const [dataRows, fields] = await conn.query({
      sql: 'SELECT * FROM `' + tableName + '` LIMIT ? OFFSET ?',
      values: [parseInt(limit, 10) || 2000, parseInt(offset, 10) || 0],
      rowsAsArray: true,
    });

    const [countRows] = await conn.query(
      'SELECT COUNT(*) AS `count` FROM `' + tableName + '`'
    );
    const total = countRows[0].count;
    const columns = fields.map((f) => f.name);

    const rows = dataRows.map((row) =>
      row.map((v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'bigint') return Number(v);
        if (Buffer.isBuffer(v)) return v.toString('utf8');
        if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
        return v;
      })
    );

    return { columns, rows, total };
  } finally {
    conn.release();
  }
}

// Get table structure (DESCRIBE)
async function getTableStructure(dbName, tableName) {
  if (IS_MOCK) return getMockTableStructure();
  const conn = await getConnection(dbName);
  try {
    const [rows] = await conn.query('DESCRIBE `' + tableName + '`');
    return rows.map((r) => ({
      field: r.Field,
      type: r.Type,
      null: r.Null,
      key: r.Key,
      default: r.Default !== null ? String(r.Default) : null,
      extra: r.Extra,
    }));
  } finally {
    conn.release();
  }
}

// Search across all columns in a table
async function searchTable(dbName, tableName, term, limit) {
  if (IS_MOCK) return getMockTableData(tableName, limit, 0);
  const conn = await getConnection(dbName);
  try {
    const [colRows] = await conn.query('SHOW COLUMNS FROM `' + tableName + '`');
    const columns = colRows.map((r) => r.Field);

    const conditions = columns.map((c) => '`' + c + '` LIKE ?');
    const whereClause = conditions.join(' OR ');
    const likeValues = columns.map(() => '%' + term + '%');

    const [dataRows, fields] = await conn.query({
      sql: 'SELECT * FROM `' + tableName + '` WHERE ' + whereClause + ' LIMIT ?',
      values: [...likeValues, parseInt(limit, 10) || 2000],
      rowsAsArray: true,
    });

    const cols = fields.map((f) => f.name);
    const rows = dataRows.map((row) =>
      row.map((v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'bigint') return Number(v);
        if (Buffer.isBuffer(v)) return v.toString('utf8');
        if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
        return v;
      })
    );

    return { columns: cols, rows, total: rows.length };
  } finally {
    conn.release();
  }
}

// Update a row in a table
async function updateRow(dbName, tableName, oldRow, newRow) {
  const conn = await getConnection(dbName);
  try {
    const setClause = Object.keys(newRow)
      .map((k) => '`' + k + '` = ?')
      .join(', ');
    const whereClause = Object.keys(oldRow)
      .map((k) => '`' + k + '` = ?')
      .join(' AND ');

    const [result] = await conn.query(
      'UPDATE `' + tableName + '` SET ' + setClause + ' WHERE ' + whereClause + ' LIMIT 1',
      [...Object.values(newRow), ...Object.values(oldRow)]
    );

    return { affected: result.affectedRows };
  } finally {
    conn.release();
  }
}

// Delete a row from a table
async function deleteRow(dbName, tableName, row) {
  const conn = await getConnection(dbName);
  try {
    const whereClause = Object.keys(row)
      .map((k) => '`' + k + '` = ?')
      .join(' AND ');

    const [result] = await conn.query(
      'DELETE FROM `' + tableName + '` WHERE ' + whereClause + ' LIMIT 1',
      Object.values(row)
    );

    return { affected: result.affectedRows };
  } finally {
    conn.release();
  }
}

module.exports = {
  listDatabases,
  listServers,
  removeDatabase,
  removeServer,
  addServer,
  syncAll,
  getTables,
  getTableData,
  getTableStructure,
  searchTable,
  updateRow,
  deleteRow,
};
