const service = require('./announcements.service');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => res.json({ success: true, data: await service.list(req.user) }));
const create = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.create(req.user, req.body) }));
const replies = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listReplies(req.user, req.params.id) }));
const reply = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.reply(req.user, req.params.id, req.body?.body) }));

module.exports = { list, create, replies, reply };
