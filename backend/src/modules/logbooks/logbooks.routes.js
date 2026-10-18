const express = require('express');
const multer = require('multer');
const logbooksController = require('./logbooks.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const offlineSync = require('../../middleware/offlineSync');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

router.get('/me', auth, requireRole('student'), logbooksController.listMine);
router.post(
  '/me',
  auth,
  requireRole('student'),
  upload.array('files', 5),
  offlineSync({ table: 'logbook_entries' }),
  logbooksController.createEntry
);
router.post(
  '/me/weeks/:weekStart/submit',
  auth,
  requireRole('student'),
  offlineSync(),
  logbooksController.submitWeek
);
router.post(
  '/me/:entryId/files',
  auth,
  requireRole('student'),
  upload.array('files', 5),
  offlineSync({ table: 'logbook_entries' }),
  logbooksController.addFiles
);
router.put(
  '/me/:entryId',
  auth,
  requireRole('student'),
  upload.array('files', 5),
  offlineSync({ table: 'logbook_entries' }),
  logbooksController.updateEntry
);
router.delete(
  '/me/:entryId',
  auth,
  requireRole('student'),
  offlineSync(),
  logbooksController.deleteEntry
);
router.post(
  '/me/:entryId/submit',
  auth,
  requireRole('student'),
  offlineSync({ table: 'logbook_entries' }),
  logbooksController.submitEntry
);

router.get(
  '/student/:studentId',
  auth,
  requireRole('student', 'industry_supervisor', 'university_supervisor', 'admin', 'hod'),
  logbooksController.listForStudent
);
router.post(
  '/student/:studentId/weeks/:weekStart/review',
  auth,
  requireRole('industry_supervisor'),
  logbooksController.reviewWeek
);

module.exports = router;

