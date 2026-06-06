const express = require('express');
const router = express.Router();
const recordingController = require('../controllers/recordingController');
const validateDb = require('../middleware/validateDb');

// List recordings
router.get('/:dbName', validateDb, recordingController.getRecordings);

// Bulk download (accepting GET for anchor link triggers and POST for larger bodies)
router.get('/:dbName/bulk', validateDb, recordingController.downloadBulk);
router.post('/:dbName/bulk', validateDb, recordingController.downloadBulk);

// Stream single recording
router.get('/:dbName/:id', validateDb, recordingController.streamRecording);

module.exports = router;
