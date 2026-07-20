const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-code', authController.resendVerificationCode);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;
