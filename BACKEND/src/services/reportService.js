// All report SQL queries
// Reference logic from USAIM/server.py report() and report_meta() functions.
// Column names vary per customer DB -- always SHOW COLUMNS first.
const { getConnection } = require('../config/db');
const { getMockReportData, getMockReportMeta } = require('./mockData');

const IS_MOCK = process.env.MOCK_MODE === 'true';

const ALLOWED_META_COLUMNS = new Set(['campaign_id', 'customer_id', 'status', 'direction', 'call_type']);

// Detect which optional columns exist in the calls table
async function detectColumns(conn) {
  const [rows] = await conn.query("SHOW COLUMNS FROM `calls`");
  const colSet = new Set(rows.map((r) => r.Field.toLowerCase()));
  return {
    hasDirection: colSet.has('direction'),
    hasCallType: colSet.has('call_type'),
    hasIncoming: colSet.has('incoming'),
    hasOutgoing: colSet.has('outgoing'),
    hasAttempts: colSet.has('attempts'),
    hasTotalAttempts: colSet.has('total_attempts'),
  };
}

function getAttemptsCol(cols) {
  if (cols.hasAttempts) return 'attempts';
  if (cols.hasTotalAttempts) return 'total_attempts';
  return null;
}

// Get distinct values for filter dropdown columns
async function getReportMeta(dbName, column) {
  if (IS_MOCK) return getMockReportMeta(column);
  if (!ALLOWED_META_COLUMNS.has(column)) {
    throw new Error('Validation: Column \'' + column + '\' is not allowed. Must be one of: ' + [...ALLOWED_META_COLUMNS].join(', '));
  }

  const conn = await getConnection(dbName);
  try {
    const [rows] = await conn.query(
      'SELECT DISTINCT `' + column + '` FROM `calls` WHERE `' + column + '` IS NOT NULL ORDER BY `' + column + '` LIMIT 500'
    );
    return { values: rows.map((r) => String(r[column])) };
  } finally {
    conn.release();
  }
}

// Run a filtered report -- grouped (campaign/customer) or detail view
async function getReport(dbName, filters) {
  if (IS_MOCK) return getMockReportData(filters);
  const conn = await getConnection(dbName);
  try {
    const cols = await detectColumns(conn);
    const attemptsCol = getAttemptsCol(cols);

    // Build WHERE clause from filters
    const where = [];
    const params = [];

    if (filters.date_from) {
      where.push('`created_at` >= ?');
      params.push(filters.date_from + ' 00:00:00');
    }
    if (filters.date_to) {
      where.push('`created_at` <= ?');
      params.push(filters.date_to + ' 23:59:59');
    }
    if (filters.status) {
      where.push('`status` = ?');
      params.push(filters.status);
    }
    if (filters.campaign_id) {
      where.push('`campaign_id` = ?');
      params.push(filters.campaign_id);
    }
    if (filters.customer_id) {
      where.push('`customer_id` = ?');
      params.push(filters.customer_id);
    }
    if (filters.dur_min !== undefined && filters.dur_min !== '') {
      where.push('`duration` >= ?');
      params.push(Number(filters.dur_min));
    }
    if (filters.dur_max !== undefined && filters.dur_max !== '') {
      where.push('`duration` <= ?');
      params.push(Number(filters.dur_max));
    }
    if (attemptsCol && filters.attempts_min !== undefined && filters.attempts_min !== '') {
      where.push('`' + attemptsCol + '` >= ?');
      params.push(Number(filters.attempts_min));
    }

    // Direction filter - column name varies per DB
    if (filters.direction) {
      if (cols.hasDirection) {
        where.push('`direction` = ?');
        params.push(filters.direction);
      } else if (cols.hasCallType) {
        where.push('`call_type` = ?');
        params.push(filters.direction);
      } else if (filters.direction === 'outgoing' && cols.hasOutgoing) {
        where.push('`outgoing` = 1');
      } else if (filters.direction === 'incoming' && cols.hasIncoming) {
        where.push('`incoming` = 1');
      }
    }

    const whereSQL = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Determine query mode: grouped summary vs detail rows
    const groupby = filters.groupby || 'none';
    let columnsOut;
    let rows;

    if (groupby === 'campaign_id' || groupby === 'customer_id') {
      // Grouped summary
      const attemptsSelect = attemptsCol ? ', SUM(`' + attemptsCol + '`) AS total_attempts' : '';
      const directionSelect = cols.hasDirection
        ? ', SUM(CASE WHEN `direction`=\'outgoing\' THEN 1 ELSE 0 END) AS outgoing_calls, SUM(CASE WHEN `direction`=\'incoming\' THEN 1 ELSE 0 END) AS incoming_calls'
        : '';

      const sql = 'SELECT \
          `' + groupby + '` AS group_key, \
          COUNT(*) AS total_calls, \
          SUM(CASE WHEN `status`=\'answered\' THEN 1 ELSE 0 END) AS answered, \
          SUM(CASE WHEN `status`=\'not_answered\' THEN 1 ELSE 0 END) AS not_answered, \
          SUM(CASE WHEN `status`=\'hangup\' THEN 1 ELSE 0 END) AS hangup, \
          SUM(CASE WHEN `status`=\'busy\' THEN 1 ELSE 0 END) AS busy, \
          SUM(CASE WHEN `status`=\'failed\' THEN 1 ELSE 0 END) AS failed, \
          ROUND(AVG(`duration`), 0) AS avg_duration, \
          SUM(`duration`) AS total_duration \
          ' + attemptsSelect + ' \
          ' + directionSelect + ' \
        FROM `calls` \
        ' + whereSQL + ' \
        GROUP BY `' + groupby + '` \
        ORDER BY total_calls DESC \
        LIMIT 2000';

      const [dataRows, fields] = await conn.query({ sql, values: params, rowsAsArray: true });
      columnsOut = fields.map((f) => f.name);
      rows = dataRows.map((row) =>
        row.map((v) => {
          if (v === null || v === undefined) return null;
          if (typeof v === 'bigint') return Number(v);
          return v;
        })
      );
    } else {
      // Detail view
      const dirSelect = cols.hasDirection
        ? '`direction`,'
        : cols.hasCallType
          ? '`call_type`,'
          : '';
      const attSelect = attemptsCol ? '`' + attemptsCol + '`,' : '';

      const sql = 'SELECT `id`, `campaign_id`, `customer_id`, `status`, \
             ' + dirSelect + ' `duration`, ' + attSelect + ' `created_at` \
           FROM `calls` \
           ' + whereSQL + ' \
           ORDER BY `created_at` DESC \
           LIMIT 5000';

      const [dataRows, fields] = await conn.query({ sql, values: params, rowsAsArray: true });
      columnsOut = fields.map((f) => f.name);
      rows = dataRows.map((row) =>
        row.map((v) => {
          if (v === null || v === undefined) return null;
          if (typeof v === 'bigint') return Number(v);
          if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
          return v;
        })
      );
    }

    // Summary stats from full filtered set
    const [summaryRows] = await conn.query(' \
      SELECT \
        COUNT(*) AS total, \
        SUM(CASE WHEN `status`=\'answered\' THEN 1 ELSE 0 END) AS answered, \
        SUM(CASE WHEN `status`=\'not_answered\' THEN 1 ELSE 0 END) AS not_answered, \
        SUM(CASE WHEN `status`=\'hangup\' THEN 1 ELSE 0 END) AS hangup, \
        ROUND(AVG(`duration`), 0) AS avg_duration, \
        SUM(`duration`) AS total_duration \
      FROM `calls` ' + whereSQL,
      params
    );
    const s = summaryRows[0];
    const summary = {
      total: Number(s.total) || 0,
      answered: Number(s.answered) || 0,
      not_answered: Number(s.not_answered) || 0,
      hangup: Number(s.hangup) || 0,
      avg_duration: Number(s.avg_duration) || 0,
      total_duration: Number(s.total_duration) || 0,
    };

    return { columns: columnsOut, rows, summary };
  } finally {
    conn.release();
  }
}

module.exports = { getReportMeta, getReport };
