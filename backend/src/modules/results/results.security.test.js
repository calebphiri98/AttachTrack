jest.mock('../../config/db');
jest.mock('../assessments/assessments.service');
jest.mock('../notifications/notifications.service');

const db = require('../../config/db');
const notifications = require('../notifications/notifications.service');
const results = require('./results.service');

const resultId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

beforeEach(() => jest.clearAllMocks());

test('student result retrieval is blocked even after an earlier release', async () => {
  await expect(results.getMyResult(userId)).rejects.toMatchObject({ statusCode: 403 });
  expect(db.query).not.toHaveBeenCalled();
});

test('individual result publication is blocked', async () => {
  await expect(results.release({ resultId, userId })).rejects.toMatchObject({ statusCode: 403 });
  expect(db.query).not.toHaveBeenCalled();
  expect(notifications.notifySafe).not.toHaveBeenCalled();
});

test('bulk result publication is blocked', async () => {
  await expect(results.releaseAll({ userId })).rejects.toMatchObject({ statusCode: 403 });
  expect(db.query).not.toHaveBeenCalled();
  expect(notifications.notifySafe).not.toHaveBeenCalled();
});

test('HOD approval does not release a result or send student notifications', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: resultId, status: 'approved', released_at: null }] });
  const approved = await results.approve({ resultId, userId });
  expect(approved.status).toBe('approved');
  expect(approved.released_at).toBeNull();
  expect(db.query.mock.calls[0][0]).not.toContain('released_at =');
  expect(notifications.notifySafe).not.toHaveBeenCalled();
});
