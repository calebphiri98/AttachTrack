jest.mock('../../config/db');
const db = require('../../config/db');
const service = require('./announcements.service');

const admin = { id: '11111111-1111-1111-1111-111111111111', role: 'admin' };
const student = { id: '22222222-2222-2222-2222-222222222222', role: 'student' };
const supervisor = { id: '33333333-3333-3333-3333-333333333333', role: 'industry_supervisor' };
const announcementId = '44444444-4444-4444-4444-444444444444';

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockResolvedValue({ rows: [] });
});

test('only Coordinator can publish', async () => {
  await expect(service.create(student, { title: 'Hello', body: 'Message' })).rejects.toThrow('Only the Coordinator');
  expect(db.query).not.toHaveBeenCalled();
});

test('publishing requires title and body', async () => {
  await expect(service.create(admin, { title: '', body: 'Message' })).rejects.toThrow('Title is required');
  await expect(service.create(admin, { title: 'Title', body: '' })).rejects.toThrow('Announcement is required');
  await expect(service.create(admin, { title: 'Title', body: 'Message', audience: 'hod' })).rejects.toThrow('Invalid audience');
});

test('Coordinator publishes to students', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: announcementId }] });
  await expect(service.create(admin, { title: 'Notice', body: 'Hello', audience: 'students' })).resolves.toMatchObject({ id: announcementId });
  expect(db.query.mock.calls[0][1]).toEqual([admin.id, 'Notice', 'Hello', 'students']);
  expect(db.query.mock.calls[1][1][4]).toBe('students');
});

test('students cannot read supervisor-only replies', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: announcementId, audience: 'supervisors' }] });
  await expect(service.listReplies(student, announcementId)).rejects.toThrow('Announcement not found');
  expect(db.query).toHaveBeenCalledTimes(1);
});

test('supervisors can read supervisor-only replies', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: announcementId, audience: 'supervisors' }] });
  db.query.mockResolvedValueOnce({ rows: [{ id: 'reply' }] });
  await expect(service.listReplies(supervisor, announcementId)).resolves.toEqual([{ id: 'reply' }]);
});

test('students can reply to visible announcements', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: announcementId, audience: 'all' }] });
  db.query.mockResolvedValueOnce({ rows: [{ id: 'reply' }] });
  await expect(service.reply(student, announcementId, 'Thanks')).resolves.toEqual({ id: 'reply' });
  expect(db.query.mock.calls[1][1]).toEqual([announcementId, student.id, 'Thanks']);
});

test('unsupported roles cannot access announcements', async () => {
  await expect(service.list({ id: 'id', role: 'hod' })).rejects.toThrow('Not permitted');
  expect(db.query).not.toHaveBeenCalled();
});
