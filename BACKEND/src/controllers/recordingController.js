const recordingService = require('../services/recordingService');
const fs = require('fs');

async function getRecordings(req, res, next) {
  try {
    const { dbName } = req.params;
    const { limit, offset, search, date_from, date_to } = req.query;
    
    const result = await recordingService.listRecordings(dbName, {
      limit,
      offset,
      search,
      date_from,
      date_to
    });
    
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function streamRecording(req, res, next) {
  try {
    const { dbName, id } = req.params;
    const result = await recordingService.getRecordingFilePathOrBuffer(dbName, id);
    
    if (result.path) {
      // Stream file on disk
      res.setHeader('Content-Type', result.filename.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.sendFile(result.path);
    } else if (result.buffer) {
      // Mock stream
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } else {
      res.status(404).json({ success: false, error: 'Recording file not found' });
    }
  } catch (err) {
    next(err);
  }
}

async function downloadBulk(req, res, next) {
  try {
    const { dbName } = req.params;
    // Accept IDs from query (e.g. ?ids=1,2,3) or body
    const idsString = req.query.ids || (req.body && req.body.ids);
    
    if (!idsString) {
      return res.status(400).json({ success: false, error: 'No recording IDs specified' });
    }

    const ids = Array.isArray(idsString) 
      ? idsString.map(id => parseInt(id, 10))
      : String(idsString).split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid recording IDs list' });
    }

    const zipBuffer = await recordingService.createBulkZip(dbName, ids);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="recordings_bulk_${Date.now()}.zip"`);
    res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRecordings,
  streamRecording,
  downloadBulk
};
