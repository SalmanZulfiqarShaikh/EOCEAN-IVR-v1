const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const validateDb = require('../middleware/validateDb');

const METABASE_SITE_URL = process.env.METABASE_URL || 'http://localhost:3000';
const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY || 'dummy_metabase_secret_key_for_testing';

router.get('/embed/:dbName', validateDb, (req, res) => {
  const { dbName } = req.params;
  const dashboardId = parseInt(req.query.dashboard || 1, 10);

  try {
    const payload = {
      resource: { dashboard: dashboardId },
      params: {
        // You can pass specific filter params to Metabase if configured
      },
      exp: Math.round(Date.now() / 1000) + (10 * 60) // 10 minutes expiration
    };

    const token = jwt.sign(payload, METABASE_SECRET_KEY);
    const iframeUrl = `${METABASE_SITE_URL}/embed/dashboard/${token}#theme=night&bordered=true&titled=false`;

    res.json({
      success: true,
      data: {
        url: iframeUrl,
        metabase_site_url: METABASE_SITE_URL
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
