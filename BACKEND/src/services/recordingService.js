const { getConnection } = require('../config/db');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const IS_MOCK = process.env.MOCK_MODE === 'true';

// 1-second silent MP3 base64 string
const SILENT_MP3 = Buffer.from(
  '//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//uQxAcAAADSAAAAeAAAA0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC//uQxHsAAADSAAAAeAAAA0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC//uQxPsAAADSAAAAeAAAA0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC//uQxUoAAADSAAAAeAAAA0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC//uQxYsAAADSAAAAeAAAA0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC//uQxcoAAADSAAAAeAAAA0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC0gAAAEAAAC',
  'base64'
);

function generateMockRecordings(filters = {}) {
  const limit = parseInt(filters.limit, 10) || 100;
  const offset = parseInt(filters.offset, 10) || 0;
  const search = filters.search ? filters.search.toLowerCase() : '';
  const date_from = filters.date_from ? new Date(filters.date_from + 'T00:00:00') : null;
  const date_to = filters.date_to ? new Date(filters.date_to + 'T23:59:59') : null;

  const campaigns = ['Campaign_042', 'Campaign_041', 'Campaign_039', 'Campaign_040', 'Campaign_038'];
  const customers = ['CUST_001', 'CUST_007', 'CUST_012', 'CUST_019', 'CUST_027', 'CUST_033', 'CUST_042', 'CUST_055'];

  let allRecordings = [];
  // Generate a fixed list of 500 mock recordings
  for (let i = 0; i < 500; i++) {
    const id = 10000 + i;
    const campaign_id = campaigns[i % campaigns.length];
    const customer_id = customers[i % customers.length];
    const phone = `+923${String(100000000 + (i * 223789) % 900000000)}`;
    const duration = 15 + (i * 13) % 240;
    const file_size = duration * 16000;
    const filename = `rec_${id}.mp3`;
    
    const d = new Date();
    d.setDate(d.getDate() - (i % 30));
    d.setHours(8 + (i % 12), (i * 7) % 60, (i * 13) % 60);

    // Filter by search term
    if (search) {
      if (!phone.includes(search) && !campaign_id.toLowerCase().includes(search) && !filename.includes(search)) {
        continue;
      }
    }
    // Filter by dates
    if (date_from && d < date_from) continue;
    if (date_to && d > date_to) continue;

    allRecordings.push({
      id,
      call_id: id,
      phone,
      campaign_id,
      customer_id,
      duration,
      file_size,
      filename,
      created_at: d.toISOString().slice(0, 19).replace('T', ' ')
    });
  }

  // Sort descending by date
  allRecordings.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const total = allRecordings.length;
  const paginated = allRecordings.slice(offset, offset + limit);

  return {
    total,
    recordings: paginated
  };
}

async function listRecordings(dbName, filters = {}) {
  if (IS_MOCK) {
    return generateMockRecordings(filters);
  }

  const conn = await getConnection(dbName);
  try {
    const [tables] = await conn.query("SHOW TABLES LIKE 'recordings'");
    const hasRecordingsTable = tables.length > 0;

    let sql, countSql;
    let params = [];
    const limit = parseInt(filters.limit, 10) || 100;
    const offset = parseInt(filters.offset, 10) || 0;

    if (hasRecordingsTable) {
      let conditions = [];
      if (filters.search) {
        conditions.push("(`phone` LIKE ? OR `filename` LIKE ? OR `campaign_id` LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }
      if (filters.date_from) {
        conditions.push("`created_at` >= ?");
        params.push(filters.date_from + ' 00:00:00');
      }
      if (filters.date_to) {
        conditions.push("`created_at` <= ?");
        params.push(filters.date_to + ' 23:59:59');
      }
      
      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      sql = `SELECT * FROM \`recordings\` ${whereClause} ORDER BY \`created_at\` DESC LIMIT ? OFFSET ?`;
      countSql = `SELECT COUNT(*) AS count FROM \`recordings\` ${whereClause}`;
      
      const [dataRows] = await conn.query(sql, [...params, limit, offset]);
      const [countRows] = await conn.query(countSql, params);
      return {
        total: countRows[0].count,
        recordings: dataRows
      };
    } else {
      // Fallback: Use calls table for answered calls
      let conditions = ["`status` = 'answered'"];
      if (filters.search) {
        conditions.push("(`phone` LIKE ? OR `campaign_id` LIKE ? OR `customer_id` LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }
      if (filters.date_from) {
        conditions.push("`created_at` >= ?");
        params.push(filters.date_from + ' 00:00:00');
      }
      if (filters.date_to) {
        conditions.push("`created_at` <= ?");
        params.push(filters.date_to + ' 23:59:59');
      }

      const whereClause = 'WHERE ' + conditions.join(' AND ');
      sql = `SELECT id, campaign_id, customer_id, phone, duration, created_at, 
                    CONCAT('rec_', id, '.mp3') AS filename, 
                    (duration * 16000) AS file_size 
             FROM \`calls\` ${whereClause} 
             ORDER BY \`created_at\` DESC LIMIT ? OFFSET ?`;
      countSql = `SELECT COUNT(*) AS count FROM \`calls\` ${whereClause}`;

      const [dataRows] = await conn.query(sql, [...params, limit, offset]);
      const [countRows] = await conn.query(countSql, params);
      
      const recordings = dataRows.map(r => ({
        id: r.id,
        call_id: r.id,
        phone: r.phone,
        campaign_id: r.campaign_id,
        customer_id: r.customer_id,
        duration: r.duration,
        file_size: r.file_size || 0,
        filename: r.filename,
        created_at: r.created_at
      }));

      return {
        total: countRows[0].count,
        recordings
      };
    }
  } finally {
    conn.release();
  }
}

async function getRecordingFilePathOrBuffer(dbName, id) {
  if (IS_MOCK) {
    return { buffer: SILENT_MP3, filename: `rec_${id}.mp3` };
  }

  const conn = await getConnection(dbName);
  try {
    const [tables] = await conn.query("SHOW TABLES LIKE 'recordings'");
    const hasRecordingsTable = tables.length > 0;
    
    let filename;
    if (hasRecordingsTable) {
      const [rows] = await conn.query('SELECT filename FROM recordings WHERE id = ? LIMIT 1', [id]);
      if (rows.length > 0) filename = rows[0].filename;
    } else {
      const [rows] = await conn.query('SELECT id FROM calls WHERE id = ? AND status = "answered" LIMIT 1', [id]);
      if (rows.length > 0) filename = `rec_${rows[0].id}.mp3`;
    }

    if (!filename) {
      throw new Error(`Recording metadata not found for ID ${id}`);
    }

    const recordingsDir = process.env.RECORDINGS_PATH || './recordings';
    const filePath = path.resolve(path.join(recordingsDir, filename));
    const fallbackPath = path.resolve(path.join(recordingsDir, `${id}.mp3`));
    const fallbackWav = path.resolve(path.join(recordingsDir, `${id}.wav`));

    if (fs.existsSync(filePath)) {
      return { path: filePath, filename };
    } else if (fs.existsSync(fallbackPath)) {
      return { path: fallbackPath, filename: `${id}.mp3` };
    } else if (fs.existsSync(fallbackWav)) {
      return { path: fallbackWav, filename: `${id}.wav` };
    } else {
      throw new Error(`Physical recording file for ID ${id} not found on server.`);
    }
  } finally {
    conn.release();
  }
}

async function createBulkZip(dbName, ids) {
  const zip = new AdmZip();

  if (IS_MOCK) {
    for (const id of ids) {
      zip.addFile(`recording_${id}.mp3`, SILENT_MP3);
    }
    return zip.toBuffer();
  }

  const conn = await getConnection(dbName);
  try {
    const [tables] = await conn.query("SHOW TABLES LIKE 'recordings'");
    const hasRecordingsTable = tables.length > 0;

    let rows = [];
    if (hasRecordingsTable) {
      const [data] = await conn.query('SELECT id, filename FROM recordings WHERE id IN (?)', [ids]);
      rows = data;
    } else {
      const [data] = await conn.query('SELECT id, CONCAT("rec_", id, ".mp3") AS filename FROM calls WHERE id IN (?) AND status = "answered"', [ids]);
      rows = data;
    }

    const recordingsDir = process.env.RECORDINGS_PATH || './recordings';

    for (const row of rows) {
      const possiblePaths = [
        path.join(recordingsDir, row.filename),
        path.join(recordingsDir, `${row.id}.mp3`),
        path.join(recordingsDir, `${row.id}.wav`)
      ];

      let fileAdded = false;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          zip.addLocalFile(p);
          fileAdded = true;
          break;
        }
      }

      if (!fileAdded) {
        zip.addFile(`missing_recording_${row.id}.txt`, Buffer.from(`Recording file for ID ${row.id} was not found on the server.`));
      }
    }

    return zip.toBuffer();
  } finally {
    conn.release();
  }
}

module.exports = {
  listRecordings,
  getRecordingFilePathOrBuffer,
  createBulkZip
};
