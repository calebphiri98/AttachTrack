jest.mock('../../config/db');
jest.mock('../students/students.service');
jest.mock('../notifications/notifications.service');

const db = require('../../config/db');
const students = require('../students/students.service');
const notifications = require('../notifications/notifications.service');
const grades = require('./grades.service');

const studentId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

beforeEach(() => jest.clearAllMocks());

test('legacy grades endpoint never returns grades to a student', async () => {
  students.getById.mockResolvedValue({ user_id: userId, university_supervisor_id: 'some-supervisor' });
  await expect(grades.getForStudent(studentId, { id: userId, role: 'student' }))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(db.query).not.toHaveBeenCalled();
});

test('legacy single-grade release is blocked', async () => {
  await expect(grades.releaseGrade({ studentId, releasedBy: userId }))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(db.query).not.toHaveBeenCalled();
  expect(notifications.notifySafe).not.toHaveBeenCalled();
});

test('legacy bulk-grade release is blocked', async () => {
  await expect(grades.releaseAll({ releasedBy: userId }))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(db.query).not.toHaveBeenCalled();
  expect(notifications.notifySafe).not.toHaveBeenCalled();
});
