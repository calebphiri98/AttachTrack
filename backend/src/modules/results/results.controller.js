const resultsService = require('./results.service');
const asyncHandler = require('../../utils/asyncHandler');

const overview = asyncHandler(async (req, res) => {
  const data = await resultsService.getCompileOverview();
  res.status(200).json({ success: true, data });
});

const compile = asyncHandler(async (req, res) => {
  const data = await resultsService.compile({
    studentId: req.params.studentId,
    userId: req.user.id,
  });
  res.status(200).json({ success: true, data });
});

const compileAll = asyncHandler(async (req, res) => {
  const data = await resultsService.compileAll({ userId: req.user.id });
  res.status(200).json({ success: true, data });
});

const remind = asyncHandler(async (req, res) => {
  const data = await resultsService.remind({ studentId: req.params.studentId });
  res.status(200).json({ success: true, data });
});

const sendToHod = asyncHandler(async (req, res) => {
  const data = await resultsService.sendToHod();
  res.status(200).json({ success: true, data });
});

const hodResults = asyncHandler(async (req, res) => {
  const data = await resultsService.getHodResults();
  res.status(200).json({ success: true, data });
});

const approve = asyncHandler(async (req, res) => {
  const data = await resultsService.approve({
    resultId: req.params.resultId,
    userId: req.user.id,
  });
  res.status(200).json({ success: true, data });
});

const approveAll = asyncHandler(async (req, res) => {
  const data = await resultsService.approveAll({ userId: req.user.id });
  res.status(200).json({ success: true, data });
});

const release = asyncHandler(async (req, res) => {
  const data = await resultsService.release({
    resultId: req.params.resultId,
    userId: req.user.id,
  });
  res.status(200).json({ success: true, data });
});

const releaseAll = asyncHandler(async (req, res) => {
  const data = await resultsService.releaseAll({ userId: req.user.id });
  res.status(200).json({ success: true, data });
});

const mine = asyncHandler(async (req, res) => {
  const data = await resultsService.getMyResult(req.user.id);
  res.status(200).json({ success: true, data });
});

module.exports = {
  overview,
  compile,
  compileAll,
  remind,
  sendToHod,
  hodResults,
  approve,
  approveAll,
  release,
  releaseAll,
  mine,
};