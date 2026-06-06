const { Router } = require('express');
const controller = require('../controllers/reportController');
const validateDb = require('../middleware/validateDb');

const router = Router();

router.get('/meta/:dbName/:column', validateDb, controller.getReportMeta);
router.get('/:dbName',              validateDb, controller.getReport);

module.exports = router;
