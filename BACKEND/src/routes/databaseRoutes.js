const { Router } = require('express');
const controller = require('../controllers/databaseController');
const validateDb = require('../middleware/validateDb');

const router = Router();

// Database CRUD
router.get('/databases',                     controller.getAll);
router.delete('/databases/:name',            controller.removeDatabase);

// Server management
router.get('/servers',                       controller.getServers);
router.post('/servers',                      controller.addServer);
router.delete('/servers/:host/:port/:user',  controller.removeServer);

// Sync
router.post('/sync',                         controller.syncAll);

// Table browsing (scoped under dbName)
router.get('/:dbName/tables',                validateDb, controller.getTables);
router.get('/:dbName/tables/:table/data',    validateDb, controller.getTableData);
router.get('/:dbName/tables/:table/structure', validateDb, controller.getTableStructure);
router.get('/:dbName/tables/:table/search',  validateDb, controller.searchTable);
router.post('/:dbName/tables/:table/update', validateDb, controller.updateRow);
router.post('/:dbName/tables/:table/delete', validateDb, controller.deleteRow);

module.exports = router;
