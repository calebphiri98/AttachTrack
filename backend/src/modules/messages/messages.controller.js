const messagesService = require('./messages.service');
const asyncHandler = require('../../utils/asyncHandler');

const send = asyncHandler(async (req, res) => {
  const message = await messagesService.sendMessage({
    sender: req.user,
    recipientId: req.body.recipientId,
    content: req.body.content,
    file: req.file,
  });
  res.status(201).json({ success: true, data: message });
});

const threads = asyncHandler(async (req, res) => {
  const data = await messagesService.listThreads(req.user.id);
  res.status(200).json({ success: true, data });
});

const thread = asyncHandler(async (req, res) => {
  const data = await messagesService.getThread(req.user.id, req.params.userId);
  res.status(200).json({ success: true, data });
});

const markRead = asyncHandler(async (req, res) => {
  const message = await messagesService.markRead(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: message });
});

module.exports = { send, threads, thread, markRead };