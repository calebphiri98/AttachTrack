import { captureTiming } from './clock';
import { getNetworkSnapshot } from './network';
import { createRecord, patchRecord, removeRecord } from './outbox';
import { getSyncUserId, runRecordNow, triggerSync } from './syncEngine';

function requireUser() {
  const userId = getSyncUserId();
  if (!userId) {
    const error = new Error('Your session has expired. Please sign in again.');
    error.statusCode = 401;
    throw error;
  }
  return userId;
}

async function settle(record) {
  if (getNetworkSnapshot().status === 'offline') {
    return { queued: true, record };
  }
  const outcome = await runRecordNow(record.id);
  if (outcome.state === 'synced') {
    return { queued: false, data: outcome.result, record };
  }
  return { queued: true, record };
}

async function enqueue(descriptor) {
  const userId = requireUser();
  const record = await createRecord({ ...descriptor, userId, timing: captureTiming() });
  return settle(record);
}

async function amend(recordId, changes) {
  requireUser();
  const record = await patchRecord(recordId, changes);
  return settle(record);
}

export function saveLogbookEntry({ entryUuid, fields, files = [], submit }) {
  return enqueue({
    id: entryUuid,
    type: 'logbook.create',
    entityKey: `logbook:${entryUuid}`,
    label: fields.activity,
    payload: { fields, submit: Boolean(submit) },
    files,
  });
}

export function amendLogbookRecord(record, { fields, submit, addFiles = [], removeFileIds = [], removeServerFileIds }) {
  const payload = { ...record.payload, submit: Boolean(submit) };
  if (fields) payload.fields = fields;
  if (removeServerFileIds) payload.removeFileIds = removeServerFileIds;
  return amend(record.id, {
    payload,
    addFiles,
    removeFileIds,
    label: fields ? fields.activity : undefined,
  });
}

export function updateLogbookEntry({ entry, fields, files = [], removeFileIds = [], submit }) {
  return enqueue({
    type: 'logbook.update',
    entityKey: `logbook:${entry.id}`,
    label: fields.activity,
    payload: { entryId: entry.id, fields, removeFileIds, submit: Boolean(submit) },
    files,
    coalesce: true,
  });
}

export function submitLogbookEntry({ entry }) {
  if (entry._record) {
    return amendLogbookRecord(entry._record, {
      fields: null,
      submit: true,
      removeServerFileIds: entry._record.payload.removeFileIds,
    });
  }
  return enqueue({
    type: 'logbook.submit',
    entityKey: `logbook:${entry.id}`,
    label: entry.activity,
    payload: { entryId: entry.id },
    coalesce: true,
  });
}

export function submitLogbookWeek({ weekStart }) {
  return enqueue({
    type: 'logbook.submitWeek',
    entityKey: `logbook:week:${weekStart}`,
    label: `Logbook week of ${weekStart}`,
    payload: { weekStart },
    coalesce: true,
  });
}

export async function deleteLogbookEntry({ entry }) {
  requireUser();
  if (entry._local && entry._record && entry._record.type === 'logbook.create') {
    await removeRecord(entry._record.id);
    triggerSync();
    return { queued: false, data: { deleted: true } };
  }
  if (entry._record && entry._record.type === 'logbook.update') {
    await removeRecord(entry._record.id, { cascade: false });
  }
  return enqueue({
    type: 'logbook.delete',
    entityKey: `logbook:${entry.id}`,
    label: entry.activity,
    payload: { entryId: entry.id },
    coalesce: true,
  });
}

export function submitDocument({ file, recipientRole }) {
  const id = crypto.randomUUID();
  return enqueue({
    id,
    type: 'submission.create',
    entityKey: `submission:${id}`,
    label: file.name,
    payload: { recipientRole },
    files: [file],
  });
}

export function fulfillRequirement({ submissionId, file }) {
  return enqueue({
    type: 'submission.fulfill',
    entityKey: `requirement:${submissionId}`,
    label: file.name,
    payload: { submissionId },
    files: [file],
    coalesce: true,
  });
}

export function markAttendance({ studentName, ...payload }) {
  const id = crypto.randomUUID();
  const range =
    payload.dateTo && payload.dateTo !== payload.dateFrom
      ? `${payload.dateFrom} to ${payload.dateTo}`
      : payload.dateFrom;
  return enqueue({
    id,
    type: 'attendance.mark',
    entityKey: `attendance:${id}`,
    label: `Attendance: ${studentName || 'student'}, ${range}`,
    payload,
  });
}

export function saveAssessment({ kind, studentId, studentName, scores, comments, submit }) {
  return enqueue({
    type: 'assessment.save',
    entityKey: `assessment:${kind}:${studentId}`,
    label: `${submit ? 'Assessment submission' : 'Assessment draft'}: ${studentName || 'student'}`,
    payload: { kind, studentId, studentName, scores, comments, submit: Boolean(submit) },
    coalesce: true,
  });
}

export function recordSiteVisit({ studentId, studentName, visitDate, notes, photo }) {
  const id = crypto.randomUUID();
  return enqueue({
    id,
    type: 'siteVisit.create',
    entityKey: `siteVisit:${id}`,
    label: `Site visit: ${studentName || 'student'}, ${visitDate}`,
    payload: { studentId, studentName, visitDate, notes },
    files: photo ? [photo] : [],
  });
}

export function sendMessage({ recipientId, recipientName, content, file }) {
  const id = crypto.randomUUID();
  return enqueue({
    id,
    type: 'message.send',
    entityKey: `thread:${recipientId}`,
    label: `Message to ${recipientName || 'contact'}`,
    priority: 5,
    payload: { recipientId, recipientName, content },
    files: file ? [file] : [],
  });
}
