// Request handling for reports API
// No SQL here. All business logic in reportService.
const reportService = require('../services/reportService');

async function getReport(req, res) {
  const { dbName } = req.params;
  const filters = {
    groupby: req.query.groupby || 'none',
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    status: req.query.status,
    direction: req.query.direction,
    dur_min: req.query.dur_min,
    dur_max: req.query.dur_max,
    campaign_id: req.query.campaign_id,
    customer_id: req.query.customer_id,
    attempts_min: req.query.attempts_min,
  };
  const data = await reportService.getReport(dbName, filters);
  res.json({ success: true, data });
}

async function getReportMeta(req, res) {
  const { dbName, column } = req.params;
  const data = await reportService.getReportMeta(dbName, column);
  res.json({ success: true, data });
}

module.exports = { getReport, getReportMeta };
