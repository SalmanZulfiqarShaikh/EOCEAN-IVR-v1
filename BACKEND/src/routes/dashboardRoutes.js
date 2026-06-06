const { Router } = require('express');
const controller = require('../controllers/dashboardController');
const validateDb = require('../middleware/validateDb');

const router = Router();

router.get('/:dbName', validateDb, controller.getDashboard);

module.exports = router;
