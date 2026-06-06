// ── Mock Data Generator — 500 consistent call records ──────────────
// All dashboard KPIs, charts, CDR, recordings, and reports derive from
// this single data set so everything is consistent.

const CAMPAIGNS = ['SALE_2025', 'LOYALTY_PROG', 'SURVEY_Q1', 'DEBT_COLLECTION', 'WELCOME_CALL', 'RENEWAL_ALERT', 'FEEDBACK_Apr', 'VERIFICATION'];
const CUSTOMERS = ['CUST_A001', 'CUST_B002', 'CUST_C003', 'CUST_D004', 'CUST_E005', 'CUST_F006', 'CUST_G007', 'CUST_H008', 'CUST_I009', 'CUST_J010', 'CUST_K011', 'CUST_L012'];
const PHONES = [
  '03001234567', '03017654321', '03123456789', '03219876543',
  '03335551111', '03442223333', '03557774444', '03668885555',
  '03779996666', '03880007777', '03991118888', '03009990000',
  '03118881111', '03227772222', '03336663333', '03445554444',
];
const STATUSES = ['answered', 'not_answered', 'hangup', 'busy', 'failed'];
const DIRECTIONS = ['outgoing', 'incoming'];
const STATUS_WEIGHTS = [40, 25, 15, 10, 10]; // percentage weights

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedStatus() {
  const r = Math.random() * 100;
  let cum = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    cum += STATUS_WEIGHTS[i];
    if (r <= cum) return STATUSES[i];
  }
  return 'answered';
}

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return d;
}

function formatDate(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function formatDateShort(d) {
  return d.toISOString().slice(0, 10);
}

// ── Generate 500 call records ──────────────────────────────────────
const TOTAL_RECORDS = 500;
let callRecords = [];
let idCounter = 10000;

for (let i = 0; i < TOTAL_RECORDS; i++) {
  const status = weightedStatus();
  const direction = pick(DIRECTIONS);
  const duration = status === 'answered'
    ? Math.floor(Math.random() * 300) + 5
    : Math.floor(Math.random() * 30);
  const date = randomDate(60);
  const campaign = pick(CAMPAIGNS);
  const customer = pick(CUSTOMERS);

  callRecords.push({
    id: idCounter++,
    campaign_id: campaign,
    customer_id: customer,
    phone: pick(PHONES),
    status,
    direction,
    duration,
    total_attempts: Math.floor(Math.random() * 4) + 1,
    created_at: formatDate(date),
    _date: date, // internal use for grouping
  });
}

// Sort by date descending
callRecords.sort((a, b) => b._date - a._date);

// ── Compute Dashboard from filtered records ────────────────────────
function computeDashboard(days) {
  const filtered = days > 0
    ? callRecords.filter(r => {
        const diff = (new Date() - r._date) / (1000 * 60 * 60 * 24);
        return diff <= days;
      })
    : callRecords;

  const now = new Date();
  const todayStr = formatDateShort(now);
  const todayRecords = filtered.filter(r => formatDateShort(r._date) === todayStr);

  const kpi = {
    total: filtered.length,
    answered: filtered.filter(r => r.status === 'answered').length,
    not_answered: filtered.filter(r => r.status === 'not_answered').length,
    hangup: filtered.filter(r => r.status === 'hangup').length,
    busy: filtered.filter(r => r.status === 'busy').length,
    failed: filtered.filter(r => r.status === 'failed').length,
    avg_duration: filtered.length ? Math.round(filtered.reduce((s, r) => s + r.duration, 0) / filtered.length) : 0,
    total_duration: filtered.reduce((s, r) => s + r.duration, 0),
    today: todayRecords.length,
  };

  // Timeline (daily aggregation)
  const timelineMap = {};
  filtered.forEach(r => {
    const key = formatDateShort(r._date);
    if (!timelineMap[key]) timelineMap[key] = { date: key, total: 0, answered: 0, not_answered: 0, hangup: 0 };
    timelineMap[key].total++;
    if (r.status === 'answered') timelineMap[key].answered++;
    else if (r.status === 'not_answered') timelineMap[key].not_answered++;
    else if (r.status === 'hangup') timelineMap[key].hangup++;
  });
  const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

  // Status Breakdown
  const statusCounts = {};
  filtered.forEach(r => {
    const s = r.status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const status_breakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // Campaign Summary
  const campaignMap = {};
  filtered.forEach(r => {
    if (!campaignMap[r.campaign_id]) campaignMap[r.campaign_id] = { campaign_id: r.campaign_id, total: 0, answered: 0, not_answered: 0, total_duration: 0 };
    campaignMap[r.campaign_id].total++;
    if (r.status === 'answered') campaignMap[r.campaign_id].answered++;
    else if (r.status === 'not_answered') campaignMap[r.campaign_id].not_answered++;
    campaignMap[r.campaign_id].total_duration += r.duration;
  });
  const campaign_summary = Object.values(campaignMap)
    .map(c => ({ ...c, avg_duration: c.total ? Math.round(c.total_duration / c.total) : 0 }))
    .sort((a, b) => b.total - a.total);

  // Duration Distribution
  const buckets = { '0s': 0, '1-15s': 0, '16-30s': 0, '31-60s': 0, '1-2m': 0, '2-5m': 0, '5-10m': 0, '10m+': 0 };
  const bucketOrder = ['0s', '1-15s', '16-30s', '31-60s', '1-2m', '2-5m', '5-10m', '10m+'];
  filtered.forEach(r => {
    const d = r.duration;
    if (d === 0) buckets['0s']++;
    else if (d <= 15) buckets['1-15s']++;
    else if (d <= 30) buckets['16-30s']++;
    else if (d <= 60) buckets['31-60s']++;
    else if (d <= 120) buckets['1-2m']++;
    else if (d <= 300) buckets['2-5m']++;
    else if (d <= 600) buckets['5-10m']++;
    else buckets['10m+']++;
  });
  const duration_dist = bucketOrder.map(bucket => ({ bucket, count: buckets[bucket] }));

  // Hourly
  const hourlyMap = {};
  filtered.forEach(r => {
    const hour = r._date.getHours();
    hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
  });
  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: hourlyMap[i] || 0 }));

  // Direction
  const direction = {
    outgoing: filtered.filter(r => r.direction === 'outgoing').length,
    incoming: filtered.filter(r => r.direction === 'incoming').length,
    unknown: 0,
  };

  // Alerts
  const alerts = [];
  const lastDay = timeline[timeline.length - 1];
  if (lastDay && timeline.length > 1) {
    const avg = timeline.slice(0, -1).reduce((s, d) => s + d.total, 0) / (timeline.length - 1);
    if (lastDay.total < avg * 0.5) alerts.push(`⚠️ Today's volume (${lastDay.total}) is 50% below average (${Math.round(avg)})`);
    if (lastDay.total > avg * 2) alerts.push(`📈 Spike detected: today (${lastDay.total}) is 2x above average (${Math.round(avg)})`);
  }

  // CDR (latest records, sorted desc, filtered by days)
  const cdr = filtered.map(r => ({
    id: r.id,
    campaign_id: r.campaign_id,
    customer_id: r.customer_id,
    phone: r.phone,
    status: r.status,
    direction: r.direction,
    duration: r.duration,
    total_attempts: r.total_attempts,
    created_at: r.created_at,
  }));

  return {
    kpi,
    timeline,
    status_breakdown,
    campaign_summary,
    duration_dist,
    hourly,
    direction,
    cdr,
    alerts,
  };
}

// ── Reports Data ────────────────────────────────────────────────────
function getReportData(params = {}) {
  let filtered = [...callRecords];

  if (params.date_from) filtered = filtered.filter(r => r.created_at >= params.date_from);
  if (params.date_to) filtered = filtered.filter(r => r.created_at <= params.date_to + ' 23:59:59');
  if (params.status) filtered = filtered.filter(r => r.status === params.status);
  if (params.direction) filtered = filtered.filter(r => r.direction === params.direction);
  if (params.campaign_id) filtered = filtered.filter(r => r.campaign_id === params.campaign_id);
  if (params.customer_id) filtered = filtered.filter(r => r.customer_id === params.customer_id);
  if (params.dur_min) filtered = filtered.filter(r => r.duration >= parseInt(params.dur_min));
  if (params.dur_max) filtered = filtered.filter(r => r.duration <= parseInt(params.dur_max));

  const summary = {
    total: filtered.length,
    answered: filtered.filter(r => r.status === 'answered').length,
    not_answered: filtered.filter(r => r.status === 'not_answered').length,
    hangup: filtered.filter(r => r.status === 'hangup').length,
    busy: filtered.filter(r => r.status === 'busy').length,
    failed: filtered.filter(r => r.status === 'failed').length,
    avg_duration: filtered.length ? Math.round(filtered.reduce((s, r) => s + r.duration, 0) / filtered.length) : 0,
    total_duration: filtered.reduce((s, r) => s + r.duration, 0),
  };

  const groupby = params.groupby || 'none';

  if (groupby === 'campaign_id' || groupby === 'customer_id') {
    const groupMap = {};
    filtered.forEach(r => {
      const key = r[groupby];
      if (!groupMap[key]) groupMap[key] = { group_key: key, total_calls: 0, answered: 0, not_answered: 0, hangup: 0, busy: 0, failed: 0, total_duration: 0 };
      groupMap[key].total_calls++;
      if (r.status === 'answered') groupMap[key].answered++;
      else if (r.status === 'not_answered') groupMap[key].not_answered++;
      else if (r.status === 'hangup') groupMap[key].hangup++;
      else if (r.status === 'busy') groupMap[key].busy++;
      else if (r.status === 'failed') groupMap[key].failed++;
      groupMap[key].total_duration += r.duration;
    });
    const rows = Object.values(groupMap).map(g => ({
      ...g,
      avg_duration: g.total_calls ? Math.round(g.total_duration / g.total_calls) : 0,
    })).sort((a, b) => b.total_calls - a.total_calls);

    const columns = [groupby, 'total_calls', 'answered', 'not_answered', 'hangup', 'busy', 'failed', 'avg_duration', 'total_duration'];

    return {
      columns,
      rows: rows.map(r => columns.map(c => r[c])),
      summary,
    };
  }

  // Detail view
  const columns = ['id', 'campaign_id', 'customer_id', 'phone', 'status', 'direction', 'duration', 'total_attempts', 'created_at'];
  const rows = filtered.slice(0, 500).map(r => columns.map(c => r[c]));

  return { columns, rows, summary };
}

function getReportMeta(column) {
  const ALLOWED = ['campaign_id', 'customer_id', 'status', 'direction'];
  if (!ALLOWED.includes(column)) return { values: [] };
  const values = [...new Set(callRecords.map(r => r[column]).filter(v => v != null))];
  return { values: values.sort() };
}

// ── Recordings Data ─────────────────────────────────────────────────
const recordingRecords = callRecords
  .filter(r => r.status === 'answered' && r.duration > 10)
  .slice(0, 50);

const recordingsList = recordingRecords.map((r, i) => ({
  id: r.id,
  call_id: `REC_${r.id}`,
  phone: r.phone,
  campaign_id: r.campaign_id,
  customer_id: r.customer_id,
  duration: r.duration,
  file_size: Math.floor(Math.random() * 5000000) + 500000,
  created_at: r.created_at,
}));

const recordingsTotal = recordingsList.length;

// ── DB Manager Mock Data ────────────────────────────────────────────
const dbTables = ['calls', 'campaigns', 'customers', 'recordings', 'audit_log'];

const tableData = {
  calls: {
    columns: ['id', 'campaign_id', 'customer_id', 'phone', 'status', 'direction', 'duration', 'total_attempts', 'created_at'],
    rows: callRecords.slice(0, 200).map(r => ['id', 'campaign_id', 'customer_id', 'phone', 'status', 'direction', 'duration', 'total_attempts', 'created_at'].map(c => r[c])),
  },
  campaigns: {
    columns: ['id', 'name', 'type', 'status', 'total_calls', 'answered', 'created_at'],
    rows: CAMPAIGNS.map((name, i) => [
      i + 1,
      name,
      ['outbound', 'inbound', 'survey'][Math.floor(Math.random() * 3)],
      ['active', 'paused', 'completed'][Math.floor(Math.random() * 3)],
      Math.floor(Math.random() * 200) + 50,
      Math.floor(Math.random() * 100) + 10,
      formatDate(randomDate(90)),
    ]),
  },
  customers: {
    columns: ['id', 'name', 'phone', 'email', 'total_calls', 'status'],
    rows: CUSTOMERS.map((id, i) => [
      id,
      `Customer ${String.fromCharCode(65 + i)}`,
      pick(PHONES),
      `customer${i + 1}@example.com`,
      Math.floor(Math.random() * 50) + 5,
      ['active', 'active', 'inactive', 'active'][Math.floor(Math.random() * 4)],
    ]),
  },
  recordings: {
    columns: ['id', 'call_id', 'phone', 'campaign_id', 'duration', 'file_size', 'created_at'],
    rows: recordingsList.map(r => [r.id, r.call_id, r.phone, r.campaign_id, r.duration, r.file_size, r.created_at]),
  },
  audit_log: {
    columns: ['id', 'action', 'user', 'table_name', 'record_id', 'created_at'],
    rows: Array.from({ length: 50 }, (_, i) => [
      i + 1,
      ['INSERT', 'UPDATE', 'DELETE', 'SELECT'][Math.floor(Math.random() * 4)],
      ['admin', 'system', 'api_user', 'analyst'][Math.floor(Math.random() * 4)],
      pick(['calls', 'campaigns', 'customers', 'recordings']),
      Math.floor(Math.random() * 10000) + 1000,
      formatDate(randomDate(30)),
    ]),
  },
};

const tableStructure = {
  calls: [
    { field: 'id', type: 'int(11)', null: 'NO', key: 'PRI', default: null, extra: 'auto_increment' },
    { field: 'campaign_id', type: 'varchar(50)', null: 'YES', key: 'MUL', default: null, extra: '' },
    { field: 'customer_id', type: 'varchar(50)', null: 'YES', key: '', default: null, extra: '' },
    { field: 'phone', type: 'varchar(20)', null: 'NO', key: '', default: null, extra: '' },
    { field: 'status', type: 'varchar(20)', null: 'YES', key: '', default: 'pending', extra: '' },
    { field: 'direction', type: 'varchar(10)', null: 'YES', key: '', default: 'outgoing', extra: '' },
    { field: 'duration', type: 'int(11)', null: 'YES', key: '', default: '0', extra: '' },
    { field: 'total_attempts', type: 'int(11)', null: 'YES', key: '', default: '1', extra: '' },
    { field: 'created_at', type: 'datetime', null: 'YES', key: '', default: null, extra: '' },
  ],
};

// ── Export ──────────────────────────────────────────────────────────
const mockData = {
  // Dashboard
  getDashboard: (dbName, days) => ({ success: true, data: computeDashboard(days) }),

  // Reports
  getReport: (params = {}) => {
    const result = getReportData(params);
    return { success: true, data: result };
  },
  getReportMeta: (column) => {
    return { success: true, data: getReportMeta(column) };
  },

  // Recordings
  getRecordings: (params = {}) => {
    let list = [...recordingsList];
    if (params.search) {
      const term = params.search.toLowerCase();
      list = list.filter(r =>
        r.phone.includes(term) || String(r.call_id).toLowerCase().includes(term) ||
        String(r.campaign_id).toLowerCase().includes(term)
      );
    }
    if (params.date_from) list = list.filter(r => r.created_at >= params.date_from);
    if (params.date_to) list = list.filter(r => r.created_at <= params.date_to + ' 23:59:59');

    const offset = params.offset || 0;
    const limit = params.limit || 50;
    const paginated = list.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        recordings: paginated,
        total: list.length,
      },
    };
  },
  getRecordingStreamUrl: (dbName, id) => {
    return '/recordings/sample.mp3';
  },
  getBulkDownloadUrl: (dbName, ids) => {
    return '/recordings/sample.mp3';
  },

  // DB Manager
  getTables: (dbName) => ({ data: dbTables }),
  getTableData: (dbName, tableName, limit = 200, offset = 0) => {
    const t = tableData[tableName] || tableData.calls;
    return { data: { columns: t.columns, rows: t.rows.slice(offset, offset + limit), total: t.rows.length } };
  },
  getTableStructure: (dbName, tableName) => {
    return { data: tableStructure[tableName] || tableStructure.calls };
  },
  searchTable: (dbName, tableName, term, limit = 200) => {
    const t = tableData[tableName] || tableData.calls;
    const filtered = t.rows.filter(row =>
      row.some(cell => String(cell || '').toLowerCase().includes(term.toLowerCase()))
    );
    return { data: { columns: t.columns, rows: filtered.slice(0, limit), total: filtered.length } };
  },

  // Config
  getDatabases: () => ({
    success: true,
    data: [
      { name: 'Customer ABC', dbname: 'customer_abc' },
      { name: 'Opay API', dbname: 'opay_api_robo3' },
      { name: 'SMS Gateway', dbname: 'sms_gw_prod' },
      { name: 'Voice Broadcast', dbname: 'voice_broadcast' },
    ],
  }),
  syncDatabases: () => ({ success: true }),
  addServer: () => ({ success: true }),
  removeDatabase: () => ({ success: true }),
};

export default mockData;
