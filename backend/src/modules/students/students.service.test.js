jest.mock('../../config/db');
const db = require('../../config/db');
const { attachUserAccount, updateLocation } = require('./students.service');

beforeEach(() => {
  jest.resetAllMocks();
});

function studentRow(overrides = {}) {
  return {
    id: 'student-id',
    user_id: null,
    industry_supervisor_id: null,
    university_supervisor_id: null,
    link_status: 'unlinked',
    ...overrides,
  };
}

describe('link status when a student account is attached', () => {
  test('new student with no supervisors stays unlinked and keeps the account name', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [studentRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [studentRow({ user_id: 'new-user-id' })] });

    const result = await attachUserAccount({
      email: 'freshstudent@example.com',
      name: 'Fresh Student',

      userId: 'new-user-id',
    });

    expect(result.link_status).toBe('unlinked');
    expect(db.query).toHaveBeenCalledTimes(4);
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      'UPDATE students SET user_id = $1, name = $2 WHERE id = $3',
      ['new-user-id', 'Fresh Student', 'student-id']
    );
  });

  test('student with only an industry supervisor stays unlinked', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [studentRow({ industry_supervisor_id: 'is-id' })] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [studentRow({ user_id: 'new-user-id', industry_supervisor_id: 'is-id' })],
      });

    const result = await attachUserAccount({
      email: 'onesupervisor@example.com',
      name: 'One Supervisor',
      userId: 'new-user-id',
    });

    expect(result.link_status).toBe('unlinked');
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  test('student with only a university supervisor stays unlinked', async () => {
    db.query

      .mockResolvedValueOnce({ rows: [studentRow({ university_supervisor_id: 'us-id' })] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [studentRow({ user_id: 'new-user-id', university_supervisor_id: 'us-id' })],
      });

    const result = await attachUserAccount({
      email: 'onesupervisor@example.com',
      name: 'One Supervisor',
      userId: 'new-user-id',
    });

    expect(result.link_status).toBe('unlinked');
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  test('student with both supervisors becomes linked once the account is attached', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [studentRow({ industry_supervisor_id: 'is-id', university_supervisor_id: 'us-id' })],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          studentRow({
            user_id: 'new-user-id',
            industry_supervisor_id: 'is-id',
            university_supervisor_id: 'us-id',
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] });


    const result = await attachUserAccount({
      email: 'bothsupervisors@example.com',
      name: 'Both Supervisors',
      userId: 'new-user-id',
    });

    expect(result.link_status).toBe('linked');
    expect(db.query).toHaveBeenNthCalledWith(
      4,
      'UPDATE students SET link_status = $1 WHERE id = $2',
      ['linked', 'student-id']
    );
  });

  test('already linked student is left unchanged', async () => {
    const linked = studentRow({
      user_id: 'existing-user-id',
      industry_supervisor_id: 'is-id',
      university_supervisor_id: 'us-id',
      link_status: 'linked',
    });
    db.query
      .mockResolvedValueOnce({ rows: [linked] })
      .mockResolvedValueOnce({ rows: [linked] });

    const result = await attachUserAccount({
      email: 'linked@example.com',
      name: 'Linked Student',
      userId: 'existing-user-id',
    });


    expect(result.link_status).toBe('linked');
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('rejects when the student email is already linked to a different user account', async () => {
    db.query.mockResolvedValueOnce({ rows: [studentRow({ user_id: 'a-different-user-id' })] });

    await expect(
      attachUserAccount({
        email: 'conflicted@example.com',
        name: 'Conflicted Student',
        userId: 'new-user-id',
      })
    ).rejects.toThrow('This student email is already linked to a different account');
  });
});

describe('input validation when attaching an account', () => {
  test('rejects an invalid email', async () => {
    await expect(
      attachUserAccount({ email: 'not-an-email', name: 'Someone', userId: 'user-id' })
    ).rejects.toThrow('Please provide a valid email address');
  });

  test('rejects an empty name', async () => {
    await expect(
      attachUserAccount({ email: 'valid@example.com', name: '', userId: 'user-id' })
    ).rejects.toThrow('name is required');
  });
});

describe('student profile updates', () => {

  test('updateLocation stores a trimmed value and returns the student row', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'student-id', user_id: 'user-id', location: null }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'student-id', user_id: 'user-id', location: '123 Main Street' }],
      });

    const result = await updateLocation({ userId: 'user-id', location: '   123 Main Street   ' });

    expect(result.location).toBe('123 Main Street');
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE students SET location = $1 WHERE user_id = $2 RETURNING *',
      ['123 Main Street', 'user-id']
    );
  });
});
