function cronAuth(req, res, next) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers['x-cron-secret'];
  if (!expected || provided !== expected) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

module.exports = cronAuth;
