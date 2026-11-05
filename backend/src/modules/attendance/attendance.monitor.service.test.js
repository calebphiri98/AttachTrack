jest.mock('../../config/db', () => ({ query: jest.fn() }));
const db = require('../../config/db');
const { getOverview } = require('./attendance.monitor.service');

const SAMPLE = {
  student_id: 'student-1', student_name: 'Test Student', placement_status: 'confirmed',
  present_count: 3, absent_count: 1, excused_count: 1, partial_count: 0, days_since: 2,
};

describe('attendance monitor access and aggregation', () => {
  beforeEach(() => { db.query.mockReset(); db.query.mockResolvedValue({ rows: [SAMPLE] }); });
  test('rejects students without querying the database', async () => {
    await expect(getOverview({ role: 'student', id: 'u' })).rejects.toMatchObject({ statusCode: 403 });
    expect(db.query).not.toHaveBeenCalled();
  });
  test('rejects unsupported windows', async () => {
    await expect(getOverview({ role: 'admin', id: 'u' }, '90')).rejects.toMatchObject({ statusCode: 400 });
    expect(db.query).not.toHaveBeenCalled();
  });
  test('limits supervisor queries to linked users', async () => {
    const result = await getOverview({ role: 'industry_supervisor', id: 'u' }, '7');
    expect(result.windowDays).toBe(7);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('isp.user_id = $3::uuid'), [7, 'industry_supervisor', 'u']);
  });
  test('limits university supervisors to their assigned students', async () => {
    await getOverview({ role: 'university_supervisor', id: 'u' });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('usp.user_id = $3::uuid'), [14, 'university_supervisor', 'u']);
  });
  test('does not turn missing records into absent days', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...SAMPLE, present_count: 0, absent_count: 0, days_since: null }] });
    const result = await getOverview({ role: 'hod', id: 'u' });
    expect(result.summary.recordedAbsences).toBe(0);
    expect(result.students[0].level).toBe('attention');
  });
});
