import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateAttachmentProgress } from './attachmentProgress.mjs';

test('does not guess missing dates', () => {
  assert.equal(calculateAttachmentProgress(null, null), null);
});
test('calculates upcoming, in-progress and completed states', () => {
  const start = '2026-09-01', end = '2026-09-10';
  assert.equal(calculateAttachmentProgress(start, end, new Date('2026-08-30T12:00:00')).upcoming, true);
  assert.equal(calculateAttachmentProgress(start, end, new Date('2026-09-05T12:00:00')).percent, 50);
  assert.equal(calculateAttachmentProgress(start, end, new Date('2026-09-11T12:00:00')).remaining, 0);
  assert.equal(calculateAttachmentProgress(start, end, new Date('2026-09-11T12:00:00')).completed, true);
});
test('rejects impossible ranges and dates', () => {
  assert.equal(calculateAttachmentProgress('2026-02-30', '2026-03-15'), null);
  assert.equal(calculateAttachmentProgress('2026-10-01', '2026-09-30'), null);
});
