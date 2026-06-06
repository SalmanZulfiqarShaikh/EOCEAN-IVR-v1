const { getConnection } = require('../config/db');
const { getMockDashboardData } = require('./mockData');

const IS_MOCK = process.env.MOCK_MODE === 'true';

// Detect which optional columns exist in the calls table
async function detectColumns(conn) {
  const [rows] = await conn.query("SHOW COLUMNS FROM `calls`");
  const colSet = new Set(rows.map((r) => r.Field.toLowerCase()));
  return {
    hasDirection: colSet.has('direction'),
    hasCallType: colSet.has('call_type'),
    hasIncoming: colSet.has('incoming'),
    hasOutgoing: colSet.has('outgoing'),
    hasAttempts: colSet.has('total_attempts') || colSet.has('attempts'),
    hasStatus: colSet.has('status'),
  };
}

// Build optional date-filter clause. If days <= 0, returns empty (all time).
function dateFilter(days) {
  if (!days || days <= 0) return { where: '', and: '' };
  return {
    where: 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ' + days + ' DAY)',
    and: 'AND created_at >= DATE_SUB(NOW(), INTERVAL ' + days + ' DAY)',
  };
}

// Get full dashboard data for a single database
async function getDashboardData(dbName, days) {
  if (IS_MOCK) return getMockDashboardData(days || 30);
  if (days === undefined || days === null) days = 30;
  const conn = await getConnection(dbName);
  try {
    const cols = await detectColumns(conn);
    const df = dateFilter(days);

    // KPI - totals, answered, duration, etc
    const [kpiRows] = await conn.query(' \
      SELECT \
        COUNT(*) AS total, \
        SUM(IF(status = \'answered\', 1, 0)) AS answered, \
        SUM(IF(status = \'not_answered\', 1, 0)) AS not_answered, \
        SUM(IF(status = \'hangup\', 1, 0)) AS hangup, \
        SUM(IF(status = \'busy\', 1, 0)) AS busy, \
        SUM(IF(status = \'failed\', 1, 0)) AS failed, \
        ROUND(AVG(duration), 0) AS avg_duration, \
        SUM(duration) AS total_duration, \
        SUM(IF(DATE(created_at) = CURDATE(), 1, 0)) AS today \
      FROM `calls` \
      ' + df.where);
    const kpiRow = kpiRows[0];
    const kpi = {
      total: Number(kpiRow.total) || 0,
      answered: Number(kpiRow.answered) || 0,
      not_answered: Number(kpiRow.not_answered) || 0,
      hangup: Number(kpiRow.hangup) || 0,
      busy: Number(kpiRow.busy) || 0,
      failed: Number(kpiRow.failed) || 0,
      avg_duration: Number(kpiRow.avg_duration) || 0,
      total_duration: Number(kpiRow.total_duration) || 0,
      today: Number(kpiRow.today) || 0,
    };

    // Timeline - daily call volume
    const [tlRows] = await conn.query(' \
      SELECT \
        DATE(created_at) AS `date`, \
        COUNT(*) AS total, \
        SUM(IF(status = \'answered\', 1, 0)) AS answered, \
        SUM(IF(status = \'not_answered\', 1, 0)) AS not_answered, \
        SUM(IF(status = \'hangup\', 1, 0)) AS hangup \
      FROM `calls` \
      ' + df.where + ' \
      GROUP BY DATE(created_at) \
      ORDER BY `date` ASC');
    const timeline = tlRows.map((r) => ({
      date: r.date ? r.date.toISOString().slice(0, 10) : String(r.date),
      total: Number(r.total),
      answered: Number(r.answered) || 0,
      not_answered: Number(r.not_answered) || 0,
      hangup: Number(r.hangup) || 0,
    }));

    // Status breakdown
    const [sbRows] = await conn.query(' \
      SELECT status, COUNT(*) AS `count` \
      FROM `calls` \
      ' + df.where + ' \
      GROUP BY status \
      ORDER BY `count` DESC');
    const status_breakdown = sbRows.map((r) => ({
      status: r.status || 'unknown',
      count: Number(r.count),
    }));

    // Campaign summary - top 20
    const [campRows] = await conn.query(' \
      SELECT \
        campaign_id, \
        COUNT(*) AS total, \
        SUM(IF(status = \'answered\', 1, 0)) AS answered, \
        SUM(IF(status = \'not_answered\', 1, 0)) AS not_answered, \
        ROUND(AVG(duration), 0) AS avg_duration \
      FROM `calls` \
      ' + df.where + ' \
      GROUP BY campaign_id \
      ORDER BY total DESC \
      LIMIT 20');
    const campaign_summary = campRows.map((r) => ({
      campaign_id: r.campaign_id,
      total: Number(r.total),
      answered: Number(r.answered) || 0,
      not_answered: Number(r.not_answered) || 0,
      avg_duration: Number(r.avg_duration) || 0,
    }));

    // Duration distribution - bucketed ranges
    const [durRows] = await conn.query(' \
      SELECT \
        CASE \
          WHEN duration = 0 THEN \'0s\' \
          WHEN duration <= 15 THEN \'1-15s\' \
          WHEN duration <= 30 THEN \'16-30s\' \
          WHEN duration <= 60 THEN \'31-60s\' \
          WHEN duration <= 120 THEN \'1-2m\' \
          WHEN duration <= 300 THEN \'2-5m\' \
          WHEN duration <= 600 THEN \'5-10m\' \
          ELSE \'10m+\' \
        END AS bucket, \
        COUNT(*) AS `count` \
      FROM `calls` \
      ' + df.where + ' \
      GROUP BY bucket \
      ORDER BY FIELD(bucket, \'0s\',\'1-15s\',\'16-30s\',\'31-60s\',\'1-2m\',\'2-5m\',\'5-10m\',\'10m+\')');
    const duration_dist = durRows.map((r) => ({
      bucket: r.bucket,
      count: Number(r.count),
    }));

    // Hourly call volume
    const [hrRows] = await conn.query(' \
      SELECT HOUR(created_at) AS `hour`, COUNT(*) AS `count` \
      FROM `calls` \
      ' + df.where + ' \
      GROUP BY HOUR(created_at) \
      ORDER BY `hour`');
    const hourly = hrRows.map((r) => ({
      hour: Number(r.hour),
      count: Number(r.count),
    }));

    // Direction breakdown (column names vary per DB)
    const direction = { outgoing: 0, incoming: 0, unknown: 0 };
    if (cols.hasDirection) {
      const [dirRows] = await conn.query('SELECT direction, COUNT(*) AS c FROM `calls` ' + df.where + ' GROUP BY direction');
      for (const r of dirRows) {
        const d = (r.direction || 'unknown').toLowerCase();
        if (direction[d] !== undefined) direction[d] = Number(r.c);
        else direction.unknown += Number(r.c);
      }
    } else if (cols.hasCallType) {
      const [dirRows] = await conn.query('SELECT call_type, COUNT(*) AS c FROM `calls` ' + df.where + ' GROUP BY call_type');
      for (const r of dirRows) {
        const d = (r.call_type || 'unknown').toLowerCase();
        if (direction[d] !== undefined) direction[d] = Number(r.c);
        else direction.unknown += Number(r.c);
      }
    } else if (cols.hasOutgoing && cols.hasIncoming) {
      const [dirRows] = await conn.query('SELECT SUM(`outgoing`) AS o, SUM(`incoming`) AS i FROM `calls` ' + df.where);
      const r = dirRows[0];
      direction.outgoing = Number(r.o) || 0;
      direction.incoming = Number(r.i) || 0;
    }

    // CDR - latest 1000 records
    const dirSelect = cols.hasDirection
      ? '`direction`,'
      : cols.hasCallType
        ? '`call_type`,'
        : '';
    const attSelect = cols.hasAttempts ? '`total_attempts`,' : '';
    const [cdrRows, cdrFields] = await conn.query({
      sql: 'SELECT `id`, `campaign_id`, `customer_id`, `phone`, `status`, \
             ' + dirSelect + ' ' + attSelect + ' `duration`, `created_at` \
           FROM `calls` \
           ' + df.where + ' \
           ORDER BY `created_at` DESC \
           LIMIT 1000',
      rowsAsArray: false,
    });
    const cdrCols = cdrFields.map((f) => f.name);
    const cdr = cdrRows.map((row) => {
      const rec = {};
      for (const col of cdrCols) {
        let v = row[col];
        if (v === null || v === undefined) {
          rec[col] = null;
        } else if (v instanceof Date) {
          rec[col] = v.toISOString().slice(0, 19).replace('T', ' ');
        } else if (typeof v === 'bigint') {
          rec[col] = Number(v);
        } else if (Buffer.isBuffer(v)) {
          rec[col] = v.toString('utf8');
        } else {
          rec[col] = v;
        }
      }
      return rec;
    });

    // Alerts - volume anomalies and quality issues
    const alerts = [];
    if (timeline.length > 0) {
      const last = timeline[timeline.length - 1].total;
      const avg = timeline.reduce((s, r) => s + r.total, 0) / timeline.length;
      if (avg > 0 && last < avg * 0.5) {
        alerts.push('Volume drop: today (' + last + ') is 50% below average (' + Math.round(avg) + ')');
      }
      if (avg > 0 && last > avg * 2) {
        alerts.push('Spike detected: today (' + last + ') is 2x above average (' + Math.round(avg) + ')');
      }
    }
    if (kpi.total > 0 && kpi.answered / kpi.total < 0.3 && kpi.total > 50) {
      alerts.push('Low answer rate: ' + Math.round((kpi.answered / kpi.total) * 100) + '% - below 30%');
    }
    if (kpi.failed > kpi.total * 0.2) {
      alerts.push('High failure rate: ' + kpi.failed + ' failed calls');
    }
    if (kpi.today === 0) {
      alerts.push('No calls recorded today yet');
    }
    if (kpi.total === 0) {
      alerts.push('No calls found for selected period');
    }

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
  } finally {
    conn.release();
  }
}

module.exports = { getDashboardData };
