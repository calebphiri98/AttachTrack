const rateLimit = require('express-rate-limit');

// Auth endpoints are the classic abuse target: brute-forcing a password via
// repeated /login attempts, or spamming /signup and /resend-code to burn
// through the Gmail sending quota with junk verification emails. Tighter
// window and lower cap here than the rest of the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP per window across all /api/auth/* routes
  standardHeaders: true, // adds RateLimit-* response headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please wait a few minutes and try again.',
  },
});

// General safety net for the rest of the API — generous enough not to
// interfere with normal use (dashboard polling, list refreshes, etc.) but
// still a real ceiling against scraping or runaway client bugs.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});

module.exports = { authLimiter, generalLimiter };