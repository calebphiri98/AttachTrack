const env = require('../config/env');

function errorHandler(err, req, res, next) {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. Maximum size is 20MB.',
      });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (!err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.isOperational && err.code ? { code: err.code } : {}),
    ...(env.nodeEnv === 'development' && !err.isOperational ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;
