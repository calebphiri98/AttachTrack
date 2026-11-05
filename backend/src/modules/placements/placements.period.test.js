const { validDate, checkPeriod } = require('./placements.period');

test('accepts real ISO dates', () => {
  expect(validDate('2026-11-05')).toBe(true);
  expect(validDate('2026-02-30')).toBe(false);
  expect(validDate('2026-2-5')).toBe(false);
});

test('rejects reversed dates and missing values', () => {
  expect(() => checkPeriod('2026-12-01', '2026-11-01')).toThrow();
  expect(() => checkPeriod('2026-11-01', '')).toThrow();
});

test('accepts a valid period', () => {
  expect(checkPeriod('2026-09-01', '2026-12-15')).toEqual({
    startDate: '2026-09-01', endDate: '2026-12-15'
  });
});
