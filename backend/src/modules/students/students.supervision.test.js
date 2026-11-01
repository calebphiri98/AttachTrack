jest.mock('../../config/db');
const db = require('../../config/db');
const { assertSupervises, isIndustrySupervisorOf } = require('./students.service');

const STUDENT = '11111111-1111-4111-8111-111111111111';
const MAIN = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const UNIVERSITY = '44444444-4444-4444-8444-444444444444';

beforeEach(() => jest.resetAllMocks());

function mockStudent() {
  db.query.mockResolvedValueOnce({ rows: [{
    id: STUDENT,
    industry_supervisor_id: MAIN,
    university_supervisor_id: UNIVERSITY,
  }] });
}

test('main industrial supervisor retains access', async () => {
  mockStudent();
  await expect(assertSupervises(STUDENT, 'industry_supervisor_id', MAIN)).resolves.toMatchObject({ id: STUDENT });
});

test('another industrial supervisor cannot use a former temporary assignment', async () => {
  mockStudent();
  await expect(assertSupervises(STUDENT, 'industry_supervisor_id', OTHER)).rejects.toMatchObject({ statusCode: 403 });
  expect(db.query).toHaveBeenCalledTimes(1);
});

test('university supervisor retains access to assigned students', async () => {
  mockStudent();
  await expect(assertSupervises(STUDENT, 'university_supervisor_id', UNIVERSITY)).resolves.toMatchObject({ id: STUDENT });
});

test('industrial supervisor helper checks only permanent assignment', async () => {
  const student = { id: STUDENT, industry_supervisor_id: MAIN };
  await expect(isIndustrySupervisorOf(student, MAIN)).resolves.toBe(true);
  await expect(isIndustrySupervisorOf(student, OTHER)).resolves.toBe(false);
  expect(db.query).not.toHaveBeenCalled();
});
