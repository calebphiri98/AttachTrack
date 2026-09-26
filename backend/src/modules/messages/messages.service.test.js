// Mock every external dependency messages.service.js touches, so this test
// exercises only the permission logic in assertCanMessage() — no real
// database connection needed.
jest.mock('../../config/db');
jest.mock('../students/students.service');
jest.mock('../industrySupervisors/industrySupervisors.service');
jest.mock('../universitySupervisors/universitySupervisors.service');
jest.mock('../../utils/uploadToCloudinary');

const db = require('../../config/db');
const studentsService = require('../students/students.service');
const industrySupervisorsService = require('../industrySupervisors/industrySupervisors.service');
const universitySupervisorsService = require('../universitySupervisors/universitySupervisors.service');
const { sendMessage } = require('./messages.service');

// sendMessage() is the public entry point; it calls assertCanMessage()
// internally before doing anything else. Testing through sendMessage() (with
// content set, no file) exercises the exact same permission logic without
// needing to export assertCanMessage() separately just for testing.
async function attemptMessage(sender, recipientId) {
  return sendMessage({ sender, recipientId, content: 'test message', file: null });
}

// requireUuid() validates these must actually look like UUIDs, so plain
// readable strings like 'student-user-id' won't pass — use real
// UUID-shaped placeholder values instead.
const STUDENT = { id: '11111111-1111-1111-1111-111111111111', role: 'student' };
const INDUSTRY_SUP = { id: '22222222-2222-2222-2222-222222222222', role: 'industry_supervisor' };
const UNIVERSITY_SUP = { id: '33333333-3333-3333-3333-333333333333', role: 'university_supervisor' };
const OTHER_STUDENT = { id: '44444444-4444-4444-4444-444444444444', role: 'student' };

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) is important here — clearAllMocks only
  // resets call history, not queued .mockResolvedValueOnce() values or
  // .mockResolvedValue() defaults from a previous test. Without a full
  // reset, leftover mock state bleeds across tests and causes confusing,
  // order-dependent failures.
  jest.resetAllMocks();
  // sendMessage's final INSERT — irrelevant to what we're testing, but
  // needs a return shape so the function doesn't crash after permission
  // checks pass.
  db.query.mockResolvedValue({ rows: [{ id: 'new-message-id' }] });
});

describe('assertCanMessage via sendMessage — self-messaging', () => {
  test('rejects a user messaging themselves', async () => {
    await expect(attemptMessage(STUDENT, STUDENT.id)).rejects.toThrow(
      'You cannot message yourself'
    );
  });
});

describe('assertCanMessage via sendMessage — recipient must exist', () => {
  test('rejects a recipient that does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // getUserBasic finds nothing
    const nonexistentButValidUuid = '99999999-9999-9999-9999-999999999999';
    await expect(attemptMessage(STUDENT, nonexistentButValidUuid)).rejects.toThrow(
      'Recipient not found'
    );
  });
});

describe('assertCanMessage — student sender', () => {
  test('student can message their own linked industry supervisor', async () => {
    db.query.mockResolvedValueOnce({ rows: [INDUSTRY_SUP] }); // getUserBasic
    studentsService.getByUserId.mockResolvedValue({ industry_supervisor_id: 'is-record-id' });
    industrySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({
      id: 'is-record-id',
    });
    db.query.mockResolvedValueOnce({ rows: [{ id: 'new-message-id' }] }); // the INSERT

    await expect(attemptMessage(STUDENT, INDUSTRY_SUP.id)).resolves.toBeDefined();
  });

  test('student can message their own linked university supervisor', async () => {
    db.query.mockResolvedValueOnce({ rows: [UNIVERSITY_SUP] });
    studentsService.getByUserId.mockResolvedValue({ university_supervisor_id: 'us-record-id' });
    universitySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({
      id: 'us-record-id',
    });
    db.query.mockResolvedValueOnce({ rows: [{ id: 'new-message-id' }] });

    await expect(attemptMessage(STUDENT, UNIVERSITY_SUP.id)).resolves.toBeDefined();
  });

  test('student cannot message an industry supervisor they are not linked to', async () => {
    db.query.mockResolvedValueOnce({ rows: [INDUSTRY_SUP] });
    studentsService.getByUserId.mockResolvedValue({ industry_supervisor_id: 'a-different-id' });
    industrySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({
      id: 'is-record-id', // doesn't match student's industry_supervisor_id
    });

    await expect(attemptMessage(STUDENT, INDUSTRY_SUP.id)).rejects.toThrow(
      'You can only message your own linked supervisors'
    );
  });

  test('student cannot message another student', async () => {
    db.query.mockResolvedValueOnce({ rows: [OTHER_STUDENT] });
    studentsService.getByUserId.mockResolvedValue({
      industry_supervisor_id: null,
      university_supervisor_id: null,
    });

    await expect(attemptMessage(STUDENT, OTHER_STUDENT.id)).rejects.toThrow(
      'You can only message your own linked supervisors'
    );
  });
});

describe('assertCanMessage — industry supervisor sender', () => {
  test('industry supervisor can message their own student', async () => {
    db.query.mockResolvedValueOnce({ rows: [STUDENT] }); // getUserBasic
    industrySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({ id: 'is-own-id' });
    db.query.mockResolvedValueOnce({ rows: [{ id: 'a-student-row' }] }); // ownership check finds a match
    db.query.mockResolvedValueOnce({ rows: [{ id: 'new-message-id' }] }); // the INSERT

    await expect(attemptMessage(INDUSTRY_SUP, STUDENT.id)).resolves.toBeDefined();
  });

  test('industry supervisor cannot message a student that is not theirs', async () => {
    db.query.mockResolvedValueOnce({ rows: [STUDENT] });
    industrySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({ id: 'is-own-id' });
    db.query.mockResolvedValueOnce({ rows: [] }); // ownership check finds no match

    await expect(attemptMessage(INDUSTRY_SUP, STUDENT.id)).rejects.toThrow(
      'You can only message your own students or a university supervisor who shares one'
    );
  });

  test('industry supervisor can message a university supervisor who shares a student', async () => {
    db.query.mockResolvedValueOnce({ rows: [UNIVERSITY_SUP] });
    industrySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({ id: 'is-own-id' });
    universitySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({ id: 'us-own-id' });
    db.query.mockResolvedValueOnce({ rows: [{ id: 'a-shared-student' }] }); // shared-student query finds a match
    db.query.mockResolvedValueOnce({ rows: [{ id: 'new-message-id' }] }); // the INSERT

    await expect(attemptMessage(INDUSTRY_SUP, UNIVERSITY_SUP.id)).resolves.toBeDefined();
  });

  test('industry supervisor cannot message a university supervisor with no shared student', async () => {
    db.query.mockResolvedValueOnce({ rows: [UNIVERSITY_SUP] });
    industrySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({ id: 'is-own-id' });
    universitySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({ id: 'us-own-id' });
    db.query.mockResolvedValueOnce({ rows: [] }); // no shared student found

    await expect(attemptMessage(INDUSTRY_SUP, UNIVERSITY_SUP.id)).rejects.toThrow(
      'You can only message your own students or a university supervisor who shares one'
    );
  });
});

describe('assertCanMessage — university supervisor sender (unrestricted)', () => {
  test('university supervisor can message any student', async () => {
    db.query.mockResolvedValueOnce({ rows: [STUDENT] }); // getUserBasic
    db.query.mockResolvedValueOnce({ rows: [{ id: 'new-message-id' }] }); // the INSERT

    await expect(attemptMessage(UNIVERSITY_SUP, STUDENT.id)).resolves.toBeDefined();
  });

  test('university supervisor can message any industry supervisor', async () => {
    db.query.mockResolvedValueOnce({ rows: [INDUSTRY_SUP] });
    db.query.mockResolvedValueOnce({ rows: [{ id: 'new-message-id' }] });

    await expect(attemptMessage(UNIVERSITY_SUP, INDUSTRY_SUP.id)).resolves.toBeDefined();
  });
});

describe('sendMessage — content/attachment requirement', () => {
  test('rejects a message with neither content nor a file', async () => {
    db.query.mockResolvedValueOnce({ rows: [INDUSTRY_SUP] });
    const { sendMessage: send } = require('./messages.service');

    await expect(
      send({ sender: UNIVERSITY_SUP, recipientId: INDUSTRY_SUP.id, content: '', file: null })
    ).rejects.toThrow('A message must have content or an attachment');
  });
});