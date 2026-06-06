// Request handling for dashboard API
// No SQL here. All business logic in dashboardService.
const dashboardService = require('../services/dashboardService');

async function getDashboard(req, res) {
  const { dbName } = req.params;
  const days = parseInt(req.query.days, 10) || 30;
  const data = await dashboardService.getDashboardData(dbName, days);
  res.json({ success: true, data });
}

module.exports = { getDashboard };
