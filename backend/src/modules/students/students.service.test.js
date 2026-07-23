jest.mock('../../config/db');
const db = require('../../config/db');
const { assignSupervisor, attachUserAccount } = require('./students.service');

beforeEach(() => {
  jest.resetAllMocks();
});

// recomputeAndSave() is not exported directly, but assignSupervisor() and
// attachUserAccount() both call it internally as their last step — testing
// through them exercises the exact same link_status computation logic
// (computeLinkStatus) without needing to export an internal helper just
// for testing.

describe('linking logic — computeLinkStatus via assignSupervisor', () => {
  test('supervisor adds a student with no account yet — stays unlinked', async () => {
    // findOrCreateByEmail: no existing row, so it INSERTs a fresh one
    db.query
      .mockResolvedValueOnce({ rows: [] }) // SELECT: no existing student
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'student-id',
            user_id: null,
            industry_supervisor_id: null,
            university_supervisor_id: null,
            link_status: 'unlinked',
          },
        ],
      }) // INSERT: fresh unlinked row
      .mockResolvedValueOnce({ rows: [] }) // UPDATE: sets industry_supervisor_id
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'student-id',
            user_id: null, // still no account
            industry_supervisor_id: 'is-id',
            university_supervisor_id: null,
            link_status: 'unlinked',
          },
        ],
      }); // recomputeAndSave's re-SELECT

    const result = await assignSupervisor({
      email: 'newstudent@example.com',
      name: 'New Student',
      supervisorColumn: 'industry_supervisor_id',
      supervisorId: 'is-id',
    });

    // has a supervisor now, but still no verified account — must stay unlinked
    expect(result.link_status).toBe('unlinked');
  });

  test('supervisor adds a student whose account already exists and is verified — becomes linked', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'student-id',
            user_id: 'existing-user-id', // already self-registered
            industry_supervisor_id: null,
            university_supervisor_id: null,
            link_status: 'unlinked',
          },
        ],
      }) // findOrCreateByEmail: existing row found
      .mockResolvedValueOnce({ rows: [] }) // UPDATE: sets industry_supervisor_id
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'student-id',
            user_id: 'existing-user-id',
            industry_supervisor_id: 'is-id',
            university_supervisor_id: null,
            link_status: 'unlinked',
          },
        ],
      }) // recomputeAndSave's re-SELECT
      .mockResolvedValueOnce({ rows: [] }); // recomputeAndSave's UPDATE (status flips)

    const result = await assignSupervisor({
      email: 'alreadyregistered@example.com',
      name: 'Already Registered',
      supervisorColumn: 'industry_supervisor_id',
      supervisorId: 'is-id',
    });

    // has both an account AND a supervisor now — should flip to linked
    expect(result.link_status).toBe('linked');
  });

  test('rejects assigning a student who already has a different supervisor of the same type', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'student-id',
          user_id: null,
          industry_supervisor_id: 'a-different-supervisor-id', // already taken
          university_supervisor_id: null,
          link_status: 'unlinked',
        },
      ],
    });

    await expect(
      assignSupervisor({
        email: 'taken@example.com',
        name: 'Taken Student',
        supervisorColumn: 'industry_supervisor_id',
        supervisorId: 'is-id',
      })
    ).rejects.toThrow('This student is already assigned to a different supervisor of that type');
  });
});

describe('linking logic — computeLinkStatus via attachUserAccount', () => {
  test('student verifies email with no supervisor having added them yet — stays unlinked', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // findOrCreateByEmail: no existing row
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'student-id',
            user_id: null,
            industry_supervisor_id: null,
            university_supervisor_id: null,
            link_status: 'unlinked',
          },
        ],
      }) // INSERT: fresh row
      .mockResolvedValueOnce({ rows: [] }) // UPDATE: sets user_id
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'student-id',
            user_id: 'new-user-id',
            industry_supervisor_id: null, // no supervisor yet
            university_supervisor_id: null,
            link_status: 'unlinked',
          },
        ],
      }); // recomputeAndSave's re-SELECT

    const result = await attachUserAccount({
      email: 'freshstudent@example.com',
      name: 'Fresh Student',
      userId: 'new-user-id',
    });

    expect(result.link_status).toBe('unlinked');
  });

  test('student verifies email after a supervisor already added them — becomes linked', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'student-id',
            user_id: null,
            industry_supervisor_id: 'is-id', // supervisor already claimed them
            university_supervisor_id: null,
            link_status: 'unlinked',
          },
        ],
      }) // findOrCreateByEmail: existing row found
      .mockResolvedValueOnce({ rows: [] }) // UPDATE: sets user_id
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'student-id',
            user_id: 'new-user-id',
            industry_supervisor_id: 'is-id',
            university_supervisor_id: null,
            link_status: 'unlinked',
          },
        ],
      }) // recomputeAndSave's re-SELECT
      .mockResolvedValueOnce({ rows: [] }); // recomputeAndSave's UPDATE (status flips)

    const result = await attachUserAccount({
      email: 'alreadyclaimed@example.com',
      name: 'Already Claimed',
      userId: 'new-user-id',
    });

    expect(result.link_status).toBe('linked');
  });

  test('rejects when the student email is already linked to a different user account', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'student-id',
          user_id: 'a-different-user-id', // already claimed by someone else
          industry_supervisor_id: null,
          university_supervisor_id: null,
          link_status: 'unlinked',
        },
      ],
    });

    await expect(
      attachUserAccount({
        email: 'conflicted@example.com',
        name: 'Conflicted Student',
        userId: 'new-user-id',
      })
    ).rejects.toThrow('This student email is already linked to a different account');
  });
});

describe('input validation — assignSupervisor and attachUserAccount', () => {
  test('assignSupervisor rejects an invalid email', async () => {
    await expect(
      assignSupervisor({
        email: 'not-an-email',
        name: 'Someone',
        supervisorColumn: 'industry_supervisor_id',
        supervisorId: 'is-id',
      })
    ).rejects.toThrow('Please provide a valid email address');
  });

  test('assignSupervisor rejects an empty name', async () => {
    await expect(
      assignSupervisor({
        email: 'valid@example.com',
        name: '',
        supervisorColumn: 'industry_supervisor_id',
        supervisorId: 'is-id',
      })
    ).rejects.toThrow('name is required');
  });
});