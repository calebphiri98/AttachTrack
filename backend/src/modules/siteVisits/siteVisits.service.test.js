jest.mock('../../config/db', () => ({ query: jest.fn() }));
jest.mock('../students/students.service', () => ({ getById: jest.fn() }));
jest.mock('../notifications/notifications.service', () => ({ notifySafe: jest.fn() }));
jest.mock('../../utils/uploadToCloudinary', () => ({ uploadBuffer: jest.fn() }));
const db = require('../../config/db');
const students = require('../students/students.service');
const notifications = require('../notifications/notifications.service');
const service = require('./siteVisits.service');
const S = '11111111-1111-4111-8111-111111111111';
const U = '22222222-2222-4222-8222-222222222222';
const IS = '33333333-3333-4333-8333-333333333333';
const US = '44444444-4444-4444-8444-444444444444';
const IU = '55555555-5555-4555-8555-555555555555';
const UU = '66666666-6666-4666-8666-666666666666';

test('validates scheduling audience, time and staff-only visit score', () => {
  expect(service.validateSchedule({ visitDate: '2026-12-01', visitTime: '10:30', audience: 'both' }).audience).toBe('both');
  expect(() => service.validateSchedule({ visitDate: '2026-12-01', visitTime: '25:30', audience: 'both' })).toThrow();
  expect(() => service.validateSchedule({ visitDate: '2026-12-01', visitTime: '10:30', audience: 'everyone' })).toThrow();
  expect(service.validateScore('82.5')).toBe(82.5);
  expect(() => service.validateScore('101')).toThrow();
});

test('sends a schedule notification to selected recipients', async () => {
  jest.clearAllMocks();
  students.getById.mockResolvedValue({ id: S, user_id: U, university_supervisor_id: US, industry_supervisor_id: IS });
  db.query.mockImplementation(async (sql) => {
    if (sql.includes('FROM university_supervisors')) return { rows: [{ id: US }] };
    if (sql.includes('FROM industry_supervisors')) return { rows: [{ user_id: IU }] };
    if (sql.includes('INSERT INTO site_visits')) return { rows: [{ id: UU }] };
    return { rows: [] };
  });
  await service.scheduleVisit({ userId: U, studentId: S, visitDate: '2026-12-01', visitTime: '10:30', audience: 'both' });
  expect(notifications.notifySafe).toHaveBeenCalledTimes(2);
  expect(notifications.notifySafe.mock.calls.map((x) => x[0].userId).sort()).toEqual([U, IU].sort());
});

test('rejects scheduling for an unassigned university supervisor', async () => {
  jest.clearAllMocks();
  students.getById.mockResolvedValue({ id: S, university_supervisor_id: US });
  db.query.mockResolvedValue({ rows: [{ id: IS }] });
  await expect(service.scheduleVisit({ userId: U, studentId: S, visitDate: '2026-12-01', visitTime: '10:30', audience: 'student' })).rejects.toMatchObject({ statusCode: 403 });
  expect(notifications.notifySafe).not.toHaveBeenCalled();
});
