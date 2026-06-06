// Fake data for testing the frontend without a real database
// Returns realistic-looking analytics data matching the real API response format.

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTimeline(days) {
  const timeline = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const total = randomInt(400, 1600);
    const answered = randomInt(150, 800);
    timeline.push({
      date: d.toISOString().slice(0, 10),
      total,
      answered,
      not_answered: total - answered - randomInt(0, 100),
      hangup: randomInt(10, 80),
    });
  }
  return timeline;
}

function generateHourly() {
  const hours = [];
  for (let h = 0; h < 24; h++) {
    let count = 0;
    if (h >= 8 && h <= 12) count = randomInt(400, 1200);
    else if (h >= 13 && h <= 18) count = randomInt(500, 1400);
    else if (h >= 19 && h <= 21) count = randomInt(100, 400);
    else count = randomInt(0, 40);
    hours.push({ hour: h, count });
  }
  return hours;
}

function generateCampaigns() {
  const campaigns = [
    'Campaign_042', 'Campaign_041', 'Campaign_039',
    'Campaign_040', 'Campaign_038', 'Campaign_037',
    'Campaign_036', 'Campaign_035',
  ];
  return campaigns.map((id) => ({
    campaign_id: id,
    total: randomInt(2000, 15000),
    answered: randomInt(800, 8000),
    not_answered: randomInt(500, 6000),
    avg_duration: randomInt(30, 300),
  }));
}

function getMockDashboardData(days) {
  const totalCalls = randomInt(30000, 80000);
  const answered = randomInt(15000, 40000);
  const notAnswered = randomInt(10000, 30000);
  const hangup = randomInt(2000, 6000);
  const busy = randomInt(500, 2000);
  const failed = randomInt(300, 1500);
  const avgDuration = randomInt(45, 180);
  const totalDuration = avgDuration * totalCalls;
  const today = randomInt(500, 2000);

  return {
    kpi: {
      total: totalCalls,
      answered,
      not_answered: notAnswered,
      hangup,
      busy,
      failed,
      avg_duration: avgDuration,
      total_duration: totalDuration,
      today,
    },
    timeline: generateTimeline(Math.min(days || 30, 365)),
    status_breakdown: [
      { status: 'answered', count: answered },
      { status: 'not_answered', count: notAnswered },
      { status: 'hangup', count: hangup },
      { status: 'busy', count: busy },
      { status: 'failed', count: failed },
    ],
    campaign_summary: generateCampaigns(),
    duration_dist: [
      { bucket: '0s', count: randomInt(500, 3000) },
      { bucket: '1-15s', count: randomInt(2000, 8000) },
      { bucket: '16-30s', count: randomInt(4000, 12000) },
      { bucket: '31-60s', count: randomInt(6000, 18000) },
      { bucket: '1-2m', count: randomInt(8000, 25000) },
      { bucket: '2-5m', count: randomInt(5000, 15000) },
      { bucket: '5-10m', count: randomInt(2000, 8000) },
      { bucket: '10m+', count: randomInt(500, 3000) },
    ],
    hourly: generateHourly(),
    direction: {
      outgoing: randomInt(20000, 60000),
      incoming: randomInt(5000, 20000),
      unknown: randomInt(0, 1000),
    },
    cdr: generateCDR(200),
    alerts: [],
  };
}

function generateCDR(count) {
  const records = [];
  const statuses = ['answered', 'not_answered', 'hangup', 'busy', 'failed'];
  const directions = ['outgoing', 'incoming'];
  const customers = ['CUST_001', 'CUST_007', 'CUST_012', 'CUST_019', 'CUST_027', 'CUST_033', 'CUST_042', 'CUST_055'];
  const campaigns = ['Campaign_042', 'Campaign_041', 'Campaign_039', 'Campaign_040', 'Campaign_038'];

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setHours(d.getHours() - randomInt(0, 168));
    d.setMinutes(randomInt(0, 59));
    d.setSeconds(randomInt(0, 59));
    const duration = statuses[randomInt(0, 4)] === 'answered' ? randomInt(10, 600) : 0;
    records.push({
      id: 10000 + i,
      campaign_id: campaigns[randomInt(0, 4)],
      customer_id: customers[randomInt(0, 7)],
      phone: '+923' + randomInt(0, 9).toString().repeat(9),
      status: statuses[randomInt(0, 4)],
      direction: directions[randomInt(0, 1)],
      duration,
      created_at: d.toISOString().slice(0, 19).replace('T', ' '),
    });
  }
  records.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return records;
}

// Report data
function getMockReportData(filters) {
  const groupby = filters.groupby || 'none';
  let rows, columns;

  if (groupby === 'campaign_id') {
    columns = ['campaign_id', 'total_calls', 'answered', 'not_answered', 'hangup', 'busy', 'failed', 'avg_duration', 'total_duration', 'outgoing_calls', 'incoming_calls'];
    const campaigns = ['Campaign_042', 'Campaign_041', 'Campaign_039', 'Campaign_040', 'Campaign_038', 'Campaign_037', 'Campaign_036'];
    rows = campaigns.map((c) => {
      const total = randomInt(3000, 15000);
      const ans = randomInt(1000, 8000);
      return [c, total, ans, randomInt(500, 5000), randomInt(100, 800), randomInt(50, 400), randomInt(30, 300), randomInt(30, 300), total * randomInt(45, 180), randomInt(2000, 12000), randomInt(0, 3000)];
    });
  } else if (groupby === 'customer_id') {
    columns = ['customer_id', 'total_calls', 'answered', 'not_answered', 'hangup', 'busy', 'failed', 'avg_duration', 'total_duration'];
    const customers = ['CUST_001', 'CUST_007', 'CUST_012', 'CUST_019', 'CUST_027', 'CUST_033', 'CUST_042', 'CUST_055'];
    rows = customers.map((c) => {
      const total = randomInt(500, 5000);
      return [c, total, randomInt(200, 2500), randomInt(100, 2000), randomInt(20, 300), randomInt(10, 100), randomInt(5, 80), randomInt(30, 300), total * randomInt(30, 180)];
    });
  } else {
    columns = ['id', 'campaign_id', 'customer_id', 'status', 'direction', 'duration', 'created_at'];
    rows = [];
    const statuses = ['answered', 'not_answered', 'hangup', 'busy', 'failed'];
    const directions = ['outgoing', 'incoming'];
    const campaigns = ['Campaign_042', 'Campaign_041', 'Campaign_039', 'Campaign_040', 'Campaign_038'];
    const customers = ['CUST_001', 'CUST_007', 'CUST_012', 'CUST_019', 'CUST_027', 'CUST_033', 'CUST_042', 'CUST_055'];
    for (let i = 0; i < 200; i++) {
      const d = new Date();
      d.setDate(d.getDate() - randomInt(0, 30));
      const status = statuses[randomInt(0, 4)];
      rows.push([
        20000 + i, campaigns[randomInt(0, 4)], customers[randomInt(0, 7)],
        status, directions[randomInt(0, 1)],
        status === 'answered' ? randomInt(10, 600) : 0,
        d.toISOString().slice(0, 19).replace('T', ' '),
      ]);
    }
  }

  const summary = {
    total: randomInt(30000, 80000),
    answered: randomInt(15000, 40000),
    not_answered: randomInt(10000, 30000),
    hangup: randomInt(2000, 6000),
    avg_duration: randomInt(45, 180),
    total_duration: randomInt(500000, 5000000),
  };

  return { columns, rows, summary };
}

// Mock table data for DbManager table browsing
function getMockTables() {
  return ['calls', 'campaigns', 'customers', 'recordings', 'users', 'cdr_logs'];
}

function getMockTableData(table, limit, offset) {
  const columns = ['id', 'campaign_id', 'customer_id', 'phone', 'status', 'direction', 'duration', 'created_at'];
  const rows = [];
  const count = Math.min(limit || 100, 200);

  for (let i = offset + 1; i <= offset + count; i++) {
    const statuses = ['answered', 'not_answered', 'hangup', 'busy', 'failed'];
    rows.push([
      i,
      'Campaign_' + String(randomInt(1, 50)).padStart(3, '0'),
      'CUST_' + String(randomInt(1, 100)).padStart(3, '0'),
      '+923' + String(randomInt(100000000, 999999999)),
      statuses[randomInt(0, 4)],
      randomInt(0, 1) ? 'outgoing' : 'incoming',
      randomInt(0, 600),
      '2026-' + String(randomInt(1, 6)).padStart(2, '0') + '-' + String(randomInt(1, 28)).padStart(2, '0') + ' ' +
      String(randomInt(0, 23)).padStart(2, '0') + ':' + String(randomInt(0, 59)).padStart(2, '0') + ':' + String(randomInt(0, 59)).padStart(2, '0'),
    ]);
  }

  return { columns, rows, total: 50000 };
}

function getMockTableStructure() {
  return [
    { field: 'id', type: 'int(11)', null: 'NO', key: 'PRI', default: null, extra: 'auto_increment' },
    { field: 'campaign_id', type: 'varchar(50)', null: 'YES', key: 'MUL', default: null, extra: '' },
    { field: 'customer_id', type: 'varchar(50)', null: 'YES', key: 'MUL', default: null, extra: '' },
    { field: 'phone', type: 'varchar(20)', null: 'NO', key: '', default: null, extra: '' },
    { field: 'status', type: 'varchar(20)', null: 'NO', key: '', default: 'pending', extra: '' },
    { field: 'direction', type: 'varchar(10)', null: 'YES', key: '', default: 'outgoing', extra: '' },
    { field: 'duration', type: 'int(11)', null: 'YES', key: '', default: '0', extra: '' },
    { field: 'created_at', type: 'datetime', null: 'NO', key: 'MUL', default: null, extra: '' },
  ];
}

function getMockReportMeta(column) {
  if (column === 'campaign_id') return { values: ['Campaign_042', 'Campaign_041', 'Campaign_039', 'Campaign_040', 'Campaign_038', 'Campaign_037', 'Campaign_036', 'Campaign_035'] };
  if (column === 'customer_id') return { values: ['CUST_001', 'CUST_007', 'CUST_012', 'CUST_019', 'CUST_027', 'CUST_033', 'CUST_042', 'CUST_055', 'CUST_088'] };
  if (column === 'status') return { values: ['answered', 'not_answered', 'hangup', 'busy', 'failed'] };
  if (column === 'direction' || column === 'call_type') return { values: ['outgoing', 'incoming'] };
  return { values: [] };
}

module.exports = {
  getMockDashboardData,
  getMockReportData,
  getMockTables,
  getMockTableData,
  getMockTableStructure,
  getMockReportMeta,
};
