const { assessStudent, parseWindow } = require('./attendance.monitor.rules');

describe('attendance monitor classification', () => {
  const base = { student_id: 'one', placement_status: 'confirmed', present_count: 5, absent_count: 0, excused_count: 0, partial_count: 0, days_since: 1 };
  test('normal when reporting is up to date', () => {
    expect(assessStudent(base).level).toBe('normal');
  });
  test('recorded absences trigger attention', () => {
    expect(assessStudent({ ...base, absent_count: 3 }).reasons).toHaveLength(1);
  });
  test('no records is a reporting issue, never counted as absence', () => {
    const result = assessStudent({ ...base, present_count: 0, days_since: null });
    expect(result.level).toBe('attention');
    expect(result.absent_count).toBe(0);
  });
  test('unconfirmed placements are not flagged as absent', () => {
    const result = assessStudent({ ...base, placement_status: 'allocated', days_since: null, absent_count: 3 });
    expect(result.level).toBe('not_started');
  });
  test('excused is not counted as absent', () => {
    expect(assessStudent({ ...base, excused_count: 4 }).absent_count).toBe(0);
  });
  test('valid window is restricted to 7, 14 or 30 days', () => {
    expect(parseWindow(undefined)).toBe(14);
    expect(parseWindow('30')).toBe(30);
    expect(() => parseWindow('365')).toThrow();
    expect(() => parseWindow('7 days')).toThrow();
  });
});
