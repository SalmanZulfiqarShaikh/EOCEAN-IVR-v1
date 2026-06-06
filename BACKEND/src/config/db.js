// MariaDB connection pool factory
// NEVER hardcode credentials. All connection configs from databases.json (gitignored).
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pools = {};
let configCache = null;

// Resolve config file path from CONFIG_FILE env or default to ./databases.json
function getConfigPath() {
  const relPath = process.env.CONFIG_FILE || './databases.json';
  return path.resolve(relPath);
}

// Load databases.json. Cached in memory -- call invalidateCache() after writes.
function loadConfig() {
  if (configCache) return configCache;
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    configCache = { servers: [], databases: [] };
    return configCache;
  }
  try {
    configCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!configCache.servers) configCache.servers = [];
    if (!configCache.databases) configCache.databases = [];
    return configCache;
  } catch (err) {
    throw new Error('Failed to parse config file at ' + configPath + ': ' + err.message);
  }
}

// Persist config to disk and update in-memory cache
function saveConfig(data) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  configCache = data;
}

// Force config reload on next loadConfig() call
function invalidateCache() {
  configCache = null;
}

// Get a pooled connection for a named database
// Creates a new pool on first access per unique host:port:dbname combo
async function getConnection(dbName) {
  const config = loadConfig();
  const db = config.databases.find((d) => d.name === dbName);
  if (!db) {
    throw new Error('Database \'' + dbName + '\' not found');
  }

  const poolKey = db.host + ':' + db.port + ':' + db.dbname;
  if (!pools[poolKey]) {
    pools[poolKey] = mysql.createPool({
      host: db.host,
      port: parseInt(db.port, 10) || 3306,
      database: db.dbname,
      user: db.user,
      password: db.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+00:00',
    });
  }

  try {
    return await pools[poolKey].getConnection();
  } catch (err) {
    throw new Error('Failed to connect to database \'' + dbName + '\': ' + err.message);
  }
}

// Create a temporary un-pooled connection to a MySQL server (no default DB)
// Used for auto-detecting databases on a server
async function serverConnection(server) {
  const conn = await mysql.createConnection({
    host: server.host,
    port: parseInt(server.port, 10) || 3306,
    user: server.user,
    password: server.password,
    timezone: '+00:00',
  });
  return conn;
}

module.exports = {
  loadConfig,
  saveConfig,
  invalidateCache,
  getConnection,
  serverConnection,
};
