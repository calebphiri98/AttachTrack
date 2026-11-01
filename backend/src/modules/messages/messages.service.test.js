jest.mock('../../config/db');
jest.mock('../students/students.service');
jest.mock('../industrySupervisors/industrySupervisors.service');
jest.mock('../universitySupervisors/universitySupervisors.service');
jest.mock('../notifications/notifications.service');
jest.mock('../../utils/uploadToCloudinary');

const db = require('../../config/db');
const studentsService = require('../students/students.service');
const industrySupervisorsService = require('../industrySupervisors/industrySupervisors.service');
const universitySupervisorsService = require('../universitySupervisors/universitySupervisors.service');
const { sendMessage, listThreads, getThread } = require('./messages.service');

const STUDENT = { id: '11111111-1111-1111-1111-111111111111', role: 'student' };
const INDUSTRY_SUP = { id: '22222222-2222-2222-2222-222222222222', role: 'industry_supervisor' };
const UNIVERSITY_SUP = { id: '33333333-3333-3333-3333-333333333333', role: 'university_supervisor' };
const OTHER_STUDENT = { id: '44444444-4444-4444-4444-444444444444', role: 'student' };

function attemptMessage(sender, recipientId) {
  return sendMessage({ sender, recipientId, content: 'test message', file: null });
}

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(async (sql) => {
    if (sql.includes('SELECT id, name, role FROM users')) return { rows: [STUDENT] };
    if (sql.includes('SELECT name FROM users')) return { rows: [{ name: 'Sender' }] };
    if (sql.includes('INSERT INTO messages')) return { rows: [{ id: 'new-message-id' }] };
    return { rows: [] };
  });
  industrySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({ id: 'industry-record' });
  universitySupervisorsService.getSupervisorRecordByUserId.mockResolvedValue({ id: 'university-record' });
});

function mockRecipient(recipient) {
  const previous = db.query.getMockImplementation();
  db.query.mockImplementation(async (sql, params) => {
    if (sql.includes('SELECT id, name, role FROM users')) return { rows: [recipient] };
    return previous(sql, params);
  });
}

function mockOwnership(hasAccess) {
  const previous = db.query.getMockImplementation();
  db.query.mockImplementation(async (sql, params) => {
    if (sql.includes('SELECT id FROM students')) {
      return { rows: hasAccess ? [{ id: 'linked-student' }] : [] };
    }
    return previous(sql, params);
  });
}

describe('message permissions', () => {
  test('rejects self messaging', async () => {
    await expect(attemptMessage(STUDENT, STUDENT.id)).rejects.toThrow('You cannot message yourself');
  });

  test('rejects nonexistent recipients', async () => {
    const previous = db.query.getMockImplementation();
    db.query.mockImplementation(async (sql, params) => {
      if (sql.includes('SELECT id, name, role FROM users')) return { rows: [] };
      return previous(sql, params);
    });
    await expect(attemptMessage(STUDENT, OTHER_STUDENT.id)).rejects.toThrow('Recipient not found');
  });

  test('student may message assigned industry supervisor', async () => {
    mockRecipient(INDUSTRY_SUP);
    studentsService.getByUserId.mockResolvedValue({ industry_supervisor_id: 'industry-record' });
    await expect(attemptMessage(STUDENT, INDUSTRY_SUP.id)).resolves.toBeDefined();
  });

  test('student may message assigned university supervisor', async () => {
    mockRecipient(UNIVERSITY_SUP);
    studentsService.getByUserId.mockResolvedValue({ university_supervisor_id: 'university-record' });
    await expect(attemptMessage(STUDENT, UNIVERSITY_SUP.id)).resolves.toBeDefined();
  });

  test('student cannot message unassigned supervisor', async () => {
    mockRecipient(INDUSTRY_SUP);
    studentsService.getByUserId.mockResolvedValue({ industry_supervisor_id: 'different-record' });
    await expect(attemptMessage(STUDENT, INDUSTRY_SUP.id)).rejects.toThrow('You can only message your own linked supervisors');
  });

  test('student cannot message another student', async () => {
    mockRecipient(OTHER_STUDENT);
    studentsService.getByUserId.mockResolvedValue({});
    await expect(attemptMessage(STUDENT, OTHER_STUDENT.id)).rejects.toThrow('You can only message your own linked supervisors');
  });

  test('industry supervisor may message assigned student', async () => {
    mockRecipient(STUDENT);
    mockOwnership(true);
    await expect(attemptMessage(INDUSTRY_SUP, STUDENT.id)).resolves.toBeDefined();
  });

  test('industry supervisor cannot message unrelated student', async () => {
    mockRecipient(STUDENT);
    mockOwnership(false);
    await expect(attemptMessage(INDUSTRY_SUP, STUDENT.id)).rejects.toThrow('You can only message your own students');
  });

  test('industry supervisor may message university supervisor who shares a student', async () => {
    mockRecipient(UNIVERSITY_SUP);
    mockOwnership(true);
    await expect(attemptMessage(INDUSTRY_SUP, UNIVERSITY_SUP.id)).resolves.toBeDefined();
  });

  test('industry supervisor cannot message university supervisor without shared student', async () => {
    mockRecipient(UNIVERSITY_SUP);
    mockOwnership(false);
    await expect(attemptMessage(INDUSTRY_SUP, UNIVERSITY_SUP.id)).rejects.toThrow('You can only message your own students');
  });

  test('university supervisor may message assigned student', async () => {
    mockRecipient(STUDENT);
    mockOwnership(true);
    await expect(attemptMessage(UNIVERSITY_SUP, STUDENT.id)).resolves.toBeDefined();
  });

  test('university supervisor cannot message unrelated student', async () => {
    mockRecipient(STUDENT);
    mockOwnership(false);
    await expect(attemptMessage(UNIVERSITY_SUP, STUDENT.id)).rejects.toThrow('You can only message your own students');
  });

  test('university supervisor may message industry supervisor who shares a student', async () => {
    mockRecipient(INDUSTRY_SUP);
    mockOwnership(true);
    await expect(attemptMessage(UNIVERSITY_SUP, INDUSTRY_SUP.id)).resolves.toBeDefined();
  });

  test('university supervisor cannot message industry supervisor without shared student', async () => {
    mockRecipient(INDUSTRY_SUP);
    mockOwnership(false);
    await expect(attemptMessage(UNIVERSITY_SUP, INDUSTRY_SUP.id)).rejects.toThrow('You can only message your own students');
  });

  test('rejects empty messages', async () => {
    await expect(sendMessage({ sender: STUDENT, recipientId: INDUSTRY_SUP.id, content: '', file: null }))
      .rejects.toThrow('A message must have content or an attachment');
  });
});

describe('conversation history access', () => {
  test('only includes threads belonging to currently allowed contacts', async () => {
    const previous = db.query.getMockImplementation();
    studentsService.getByUserId.mockResolvedValue({ industry_supervisor_id: 'industry-record' });
    db.query.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM industry_supervisors isup') && sql.includes('JOIN users u')) {
        return { rows: [INDUSTRY_SUP] };
      }
      if (sql.includes('other.id AS user_id')) {
        return { rows: [{ user_id: INDUSTRY_SUP.id }, { user_id: OTHER_STUDENT.id }] };
      }
      return previous(sql, params);
    });
    await expect(listThreads(STUDENT)).resolves.toEqual([{ user_id: INDUSTRY_SUP.id }]);
  });

  test('denies reading conversation with unrelated contact', async () => {
    studentsService.getByUserId.mockResolvedValue({});
    await expect(getThread(STUDENT, OTHER_STUDENT.id)).rejects.toThrow('You cannot access this conversation');
    expect(db.query.mock.calls.some(([sql]) => sql.includes('FROM messages'))).toBe(false);
  });

  test('allows reading conversation with linked contact', async () => {
    const previous = db.query.getMockImplementation();
    studentsService.getByUserId.mockResolvedValue({ industry_supervisor_id: 'industry-record' });
    db.query.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM industry_supervisors isup') && sql.includes('JOIN users u')) {
        return { rows: [INDUSTRY_SUP] };
      }
      if (sql.includes('FROM messages')) return { rows: [{ id: 'existing-message' }] };
      return previous(sql, params);
    });
    await expect(getThread(STUDENT, INDUSTRY_SUP.id)).resolves.toEqual([{ id: 'existing-message' }]);
  });
});
