const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');

const signup = asyncHandler(async (req, res) => {
  const user = await authService.signup(req.body);
  res.status(201).json({
    success: true,
    message: 'Account created. Check your email for a verification code.',
    data: user,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body);
  res.status(200).json({ success: true, ...result });
});

const resendVerificationCode = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationCode(req.body);
  res.status(200).json({ success: true, ...result });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body);
  res.status(200).json({ success: true, data: result });
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.body);
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  signup,
  verifyEmail,
  resendVerificationCode,
  login,
  refresh,
  logout,
};
