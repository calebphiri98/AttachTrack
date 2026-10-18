const express = require('express');

const router = express.Router();

router.get('/ping', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, data: { serverTime: new Date().toISOString() } });
});

router.head('/ping', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(204).end();
});

module.exports = router;
