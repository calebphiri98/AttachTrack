const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'MulterError') {
    // Give the common, realistic case (file too large) its own clear
    // message rather than lumping every Multer error type under one
    // generic "Upload error: <raw message>" prefix.
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
    ...(env.nodeEnv === 'development' && !err.isOperational ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;