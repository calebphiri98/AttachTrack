import assert from 'node:assert/strict';
import test from 'node:test';
import { assignmentCategory, filterStudentDirectory, searchMatches } from '../src/utils/studentDirectory.mjs';

const students = [
  { id: '1', name: 'Ada', email: 'ada@example.test', university_supervisor_id: 'u1', industry_supervisor_id: 'i1', university_supervisor_name: 'Mr Banda' },
  { id: '2', name: 'Ben', email: 'ben@example.test', university_supervisor_id: 'u2', industry_supervisor_id: null },
  { id: '3', name: 'Chim', email: 'chim@example.test', university_supervisor_id: null, industry_supervisor_id: 'i2', company_name: 'National Water' },
  { id: '4', name: 'Dina', email: 'dina@example.test', university_supervisor_id: null, industry_supervisor_id: null },
];

test('assignment statuses use actual supervisor IDs', () => {
  assert.deepEqual(students.map(assignmentCategory), ['both', 'university_only', 'industry_only', 'none']);
});

test('every assignment filter is mutually exclusive', () => {
  for (const kind of ['both', 'university_only', 'industry_only', 'none']) {
    assert.equal(filterStudentDirectory(students, { assignment: kind }).length, 1);
  }
});

test('name, email, company and supervisor search are case insensitive', () => {
  assert.equal(filterStudentDirectory(students, { query: 'banda' })[0].name, 'Ada');
  assert.equal(filterStudentDirectory(students, { query: 'NATIONAL WATER' })[0].name, 'Chim');
  assert.equal(filterStudentDirectory(students, { query: 'BEN@' })[0].name, 'Ben');
});

test('search and assignment filter work together without mutating source', () => {
  const original = students.map(s => s.id);
  assert.equal(filterStudentDirectory(students, { assignment: 'both', query: 'Ada' }).length, 1);
  assert.equal(filterStudentDirectory(students, { assignment: 'none', query: 'Ada' }).length, 0);
  assert.deepEqual(students.map(s => s.id), original);
});

test('unknown and empty data are safe', () => {
  assert.equal(filterStudentDirectory(null).length, 0);
  assert.equal(searchMatches({ name: null }, 'missing'), false);
});
