const DAY_MS = 24 * 60 * 60 * 1000;
const SEVERITY = { failed: 3, syncing: 2, pending: 1, synced: 0 };

export function syncInfo(record) {
  return {
    status: record.status,
    error: record.error || null,
    errorCode: record.errorCode || null,
    recordId: record.id,
    retryable: record.errorCode !== 'RECORD_LOCKED',
  };
}

function strongest(current, record) {
  const next = syncInfo(record);
  if (!current) return next;
  return SEVERITY[next.status] > SEVERITY[current.status] ? next : current;
}

export function weekStartOf(dateString) {
  const time = Date.parse(`${dateString}T00:00:00Z`);
  if (!Number.isFinite(time)) return dateString;
  const day = new Date(time).getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  return new Date(time - offset * DAY_MS).toISOString().slice(0, 10);
}

function active(records, prefix) {
  return records.filter((item) => item.type.startsWith(prefix) && item.status !== 'synced');
}

function recentlySynced(records, prefix) {
  const map = new Map();
  records
    .filter((item) => item.type.startsWith(prefix) && item.status === 'synced' && item.result && item.result.id)
    .forEach((item) => map.set(item.result.id, item));
  return map;
}

function pendingFile(meta) {
  return { id: meta.id, name: meta.name, type: meta.type, url: null, pending: true };
}

function fieldsToEntry(fields) {
  return {
    entry_date: fields.entryDate,
    week_start: weekStartOf(fields.entryDate),
    start_time: fields.startTime || null,
    end_time: fields.endTime || null,
    activity: fields.activity,
    description: fields.description || '',
    skills_learned: fields.skillsLearned || '',
    challenges: fields.challenges || '',
    tools_used: fields.toolsUsed || '',
  };
}

function sortEntries(list) {
  return list.sort((a, b) => {
    if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1;
    return (b.start_time || '') < (a.start_time || '') ? -1 : 1;
  });
}

export function applyLogbookOverlay(entries, records) {
  const pending = active(records, 'logbook.');
  const synced = recentlySynced(records, 'logbook.');
  const list = entries.map((entry) => {
    const done = synced.get(entry.id);
    return done ? { ...entry, _sync: syncInfo(done) } : { ...entry };
  });
  const byId = new Map(list.map((entry) => [entry.id, entry]));
  const hidden = new Set();
  const additions = [];

  pending.forEach((record) => {
    const { payload } = record;

    if (record.type === 'logbook.create') {
      const serverId = record.progress && record.progress.serverId;
      const target = serverId ? byId.get(serverId) : null;
      const overlay = {
        ...fieldsToEntry(payload.fields),
        status: payload.submit ? 'submitted' : 'draft',
      };
      if (target) {
        Object.assign(target, overlay);
        target.files = [...(target.files || []), ...record.files.map(pendingFile)];
        target._record = record;
        target._sync = strongest(target._sync, record);
      } else {
        additions.push({
          id: record.id,
          student_id: null,
          notes: null,
          review_comment: null,
          ...overlay,
          files: record.files.map(pendingFile),
          _local: true,
          _record: record,
          _sync: syncInfo(record),
        });
      }
      return;
    }

    if (record.type === 'logbook.update') {
      const target = byId.get(payload.entryId);
      if (!target) return;
      Object.assign(target, fieldsToEntry(payload.fields));
      if (payload.submit) target.status = 'submitted';
      const removed = new Set(payload.removeFileIds || []);
      target.files = [
        ...(target.files || []).filter((file) => !removed.has(file.id)),
        ...record.files.map(pendingFile),
      ];
      target._record = record;
      target._sync = strongest(target._sync, record);
      return;
    }

    if (record.type === 'logbook.submit') {
      const target = byId.get(payload.entryId);
      if (!target) return;
      target.status = 'submitted';
      target._sync = strongest(target._sync, record);
      return;
    }

    if (record.type === 'logbook.submitWeek') {
      list.forEach((entry) => {
        if (
          entry.week_start === payload.weekStart &&
          ['draft', 'returned'].includes(entry.status) &&
          entry.description
        ) {
          entry.status = 'submitted';
          entry._sync = strongest(entry._sync, record);
        }
      });
      additions.forEach((entry) => {
        if (entry.week_start === payload.weekStart && entry.status === 'draft' && entry.description) {
          entry.status = 'submitted';
        }
      });
      return;
    }

    if (record.type === 'logbook.delete') {
      hidden.add(payload.entryId);
    }
  });

  return sortEntries([...additions, ...list.filter((entry) => !hidden.has(entry.id))]);
}

export function expandDates(dateFrom, dateTo, weekdaysOnly) {
  const from = Date.parse(`${dateFrom}T00:00:00Z`);
  const to = Date.parse(`${dateTo || dateFrom}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];
  const dates = [];
  for (let time = from; time <= to && dates.length < 62; time += DAY_MS) {
    const day = new Date(time).getUTCDay();
    if (weekdaysOnly !== false && (day === 0 || day === 6)) continue;
    dates.push(new Date(time).toISOString().slice(0, 10));
  }
  return dates;
}

export function pendingAttendanceFor(records, studentId) {
  return active(records, 'attendance.').filter((item) => item.payload.studentId === studentId);
}

export function mergeAttendance(serverRows, records, studentId) {
  const pending = pendingAttendanceFor(records, studentId);
  const rows = new Map(serverRows.map((row) => [row.attendance_date, row]));

  pending.forEach((record) => {
    const { dateFrom, dateTo, status, reason, notes, weekdaysOnly } = record.payload;
    expandDates(dateFrom, dateTo, weekdaysOnly).forEach((date) => {
      rows.set(date, {
        id: `pending:${record.id}:${date}`,
        attendance_date: date,
        status,
        reason: reason || null,
        notes: notes || null,
        marked_by_name: 'You',
        _sync: syncInfo(record),
      });
    });
  });

  return Array.from(rows.values()).sort((a, b) =>
    a.attendance_date < b.attendance_date ? 1 : -1
  );
}

export function pendingCountByStudent(records) {
  const counts = new Map();
  active(records, 'attendance.').forEach((record) => {
    const key = record.payload.studentId;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

export function pendingAssessment(records, kind, studentId) {
  return (
    active(records, 'assessment.').find(
      (item) => item.payload.kind === kind && item.payload.studentId === studentId
    ) || null
  );
}

export function overlayAssessmentList(students, records, kind) {
  return students.map((student) => {
    const record = pendingAssessment(records, kind, student.student_id);
    if (!record) return student;
    const status = record.payload.submit ? 'submitted' : student.status === 'submitted' ? 'submitted' : 'draft';
    return { ...student, status, _sync: syncInfo(record) };
  });
}

export function pendingSubmissions(records) {
  return active(records, 'submission.create');
}

export function pendingFulfillments(records) {
  const map = new Map();
  active(records, 'submission.fulfill').forEach((record) => map.set(record.payload.submissionId, record));
  return map;
}

export function pendingSiteVisits(records, studentId) {
  return active(records, 'siteVisit.').filter((item) => item.payload.studentId === studentId);
}

export function pendingMessages(records, recipientId) {
  return active(records, 'message.').filter((item) => item.payload.recipientId === recipientId);
}

export function pendingMessageCount(records) {
  return active(records, 'message.').length;
}
