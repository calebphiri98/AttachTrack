import * as logbooksApi from '../api/logbooks.api';
import * as submissionsApi from '../api/submissions.api';
import * as attendanceApi from '../api/attendanceLog.api';
import * as assessmentsApi from '../api/assessments.api';
import * as siteVisitsApi from '../api/siteVisits.api';
import * as messagesApi from '../api/messages.api';
import { getFiles, getMapping, setMapping, updateRecord } from './outbox';

const MIN_UPLOAD_TIMEOUT_MS = 30000;
const MAX_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const ASSUMED_SLOW_BYTES_PER_SECOND = 8 * 1024;

export function uploadTimeout(bytes) {
  const estimate = Math.ceil((bytes || 0) / ASSUMED_SLOW_BYTES_PER_SECOND) * 1000;
  return Math.min(MAX_UPLOAD_TIMEOUT_MS, Math.max(MIN_UPLOAD_TIMEOUT_MS, estimate));
}

function stamp(record, key) {
  const headers = {
    'Idempotency-Key': key,
    'X-Client-Created-At': record.clientCreatedAt,
  };
  if (Number.isFinite(record.clockOffsetMs)) {
    headers['X-Clock-Offset-Ms'] = String(record.clockOffsetMs);
  }
  return headers;
}

function options(record, key, bytes = 0) {
  return { headers: stamp(record, key), timeoutMs: uploadTimeout(bytes) };
}

function permanent(message, code = null) {
  const error = new Error(message);
  error.statusCode = 400;
  if (code) error.code = code;
  return error;
}

async function saveProgress(record, progress) {
  record.progress = progress;
  await updateRecord(record.id, { progress });
}

async function resolveEntryId(payload) {
  if (payload.entryId) return payload.entryId;
  if (payload.entryUuid) {
    const mapped = await getMapping(`logbook:${payload.entryUuid}`);
    if (mapped) return mapped;
  }
  throw permanent('The entry this change belongs to could not be found on the server.');
}

async function uploadEvidence(record, serverId, files, progress) {
  const done = new Set(progress.filesDone || []);
  for (const item of files) {
    if (done.has(item.meta.id)) continue;
    await logbooksApi.addLogbookFiles(
      serverId,
      [item.file],
      options(record, item.meta.id, item.file.size)
    );
    done.add(item.meta.id);
    await saveProgress(record, { ...progress, filesDone: Array.from(done) });
    progress = { ...progress, filesDone: Array.from(done) };
  }
  return progress;
}

async function logbookCreate(record) {
  const { fields, submit } = record.payload;
  const files = await getFiles(record);
  if (files.length !== record.files.length) {
    throw permanent('The evidence files for this entry are no longer stored on this device.');
  }

  let progress = { filesDone: [], ...record.progress };
  const submitWithCreate = Boolean(submit) && files.length === 0;
  let result = null;

  if (!progress.serverId) {
    const response = await logbooksApi.createLogbookEntry(
      { ...fields, submit: submitWithCreate, files: [], clientUuid: record.id },
      options(record, record.id)
    );
    result = response.data;
    progress = { ...progress, serverId: result.id, submitted: submitWithCreate };
    await setMapping(`logbook:${record.id}`, result.id);
    await saveProgress(record, progress);
  }

  progress = await uploadEvidence(record, progress.serverId, files, progress);

  if (submit && !progress.submitted) {
    const response = await logbooksApi.submitLogbookEntry(
      progress.serverId,
      options(record, `${record.id}:submit`)
    );
    result = response.data;
    progress = { ...progress, submitted: true };
    await saveProgress(record, progress);
  }

  return result || { id: progress.serverId };
}

async function logbookUpdate(record) {
  const { fields, removeFileIds = [], submit } = record.payload;
  const serverId = await resolveEntryId(record.payload);
  const files = await getFiles(record);
  if (files.length !== record.files.length) {
    throw permanent('The evidence files for this change are no longer stored on this device.');
  }

  let progress = { filesDone: [], ...record.progress };
  const submitWithUpdate = Boolean(submit) && files.length === 0;
  let result = null;

  if (!progress.updated) {
    const response = await logbooksApi.updateLogbookEntry(
      serverId,
      { ...fields, submit: submitWithUpdate, files: [], removeFileIds },
      options(record, record.id)
    );
    result = response.data;
    progress = { ...progress, updated: true, submitted: submitWithUpdate };
    await saveProgress(record, progress);
  }

  progress = await uploadEvidence(record, serverId, files, progress);

  if (submit && !progress.submitted) {
    const response = await logbooksApi.submitLogbookEntry(
      serverId,
      options(record, `${record.id}:submit`)
    );
    result = response.data;
    progress = { ...progress, submitted: true };
    await saveProgress(record, progress);
  }

  return result || { id: serverId };
}

async function logbookSubmit(record) {
  const serverId = await resolveEntryId(record.payload);
  const response = await logbooksApi.submitLogbookEntry(serverId, options(record, record.id));
  return response.data;
}

async function logbookSubmitWeek(record) {
  const response = await logbooksApi.submitLogbookWeek(
    record.payload.weekStart,
    options(record, record.id)
  );
  return response.data;
}

async function logbookDelete(record) {
  const serverId = await resolveEntryId(record.payload);
  const response = await logbooksApi.deleteLogbookEntry(serverId, options(record, record.id));
  return response.data;
}

async function firstFile(record) {
  const files = await getFiles(record);
  if (record.files.length > 0 && files.length === 0) {
    throw permanent('The file for this item is no longer stored on this device.');
  }
  return files[0] ? files[0].file : null;
}

async function submissionCreate(record) {
  const file = await firstFile(record);
  if (!file) throw permanent('The document for this submission is missing.');
  const response = await submissionsApi.submitDocument(
    file,
    record.id,
    record.payload.recipientRole,
    options(record, record.id, file.size)
  );
  return response.data;
}

async function submissionFulfill(record) {
  const file = await firstFile(record);
  if (!file) throw permanent('The document for this submission is missing.');
  const response = await submissionsApi.fulfillRequirement(
    record.payload.submissionId,
    file,
    options(record, record.id, file.size)
  );
  return response.data;
}

async function attendanceMark(record) {
  const response = await attendanceApi.saveAttendance(record.payload, options(record, record.id));
  return response.data;
}

async function assessmentSave(record) {
  const { kind, studentId, scores, comments, submit } = record.payload;
  const response = await assessmentsApi.saveAssessment(
    kind,
    studentId,
    { scores, comments, submit },
    options(record, record.id)
  );
  return response.data;
}

async function siteVisitCreate(record) {
  const photo = await firstFile(record);
  const response = await siteVisitsApi.saveSiteVisit(
    { ...record.payload, photo },
    options(record, record.id, photo ? photo.size : 0)
  );
  return response.data;
}

async function messageSend(record) {
  const file = await firstFile(record);
  const response = await messagesApi.sendMessage(
    { recipientId: record.payload.recipientId, content: record.payload.content, file },
    options(record, record.id, file ? file.size : 0)
  );
  return response.data;
}

const HANDLERS = {
  'logbook.create': logbookCreate,
  'logbook.update': logbookUpdate,
  'logbook.submit': logbookSubmit,
  'logbook.submitWeek': logbookSubmitWeek,
  'logbook.delete': logbookDelete,
  'submission.create': submissionCreate,
  'submission.fulfill': submissionFulfill,
  'attendance.mark': attendanceMark,
  'assessment.save': assessmentSave,
  'siteVisit.create': siteVisitCreate,
  'message.send': messageSend,
};

export function isKnownType(type) {
  return Object.prototype.hasOwnProperty.call(HANDLERS, type);
}

export async function executeRecord(record) {
  const handler = HANDLERS[record.type];
  if (!handler) {
    throw permanent(`This kind of item (${record.type}) is not supported by this version of the app.`);
  }
  return handler(record);
}

export function summarizeResult(type, result) {
  if (!result || typeof result !== 'object') return null;
  if (type === 'attendance.mark') {
    return {
      created: result.created,
      updated: result.updated,
      unchanged: result.unchanged,
    };
  }
  if (type === 'logbook.submitWeek') {
    return { submitted: result.submitted, skipped: result.skipped };
  }
  return result.id ? { id: result.id } : null;
}
