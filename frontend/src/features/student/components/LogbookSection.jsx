import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StatusBadge from '../../../components/shared/StatusBadge';
import SyncChip from '../../../components/shared/SyncChip';
import { useAuth } from '../../../context/AuthContext';
import * as logbooksApi from '../../../api/logbooks.api';
import * as actions from '../../../offline/actions';
import { useOutbox, useSyncRefresh } from '../../../offline/hooks';
import { applyLogbookOverlay } from '../../../offline/overlays';
import { prepareFiles, validateFiles } from '../../../offline/images';
import { discardRecord } from '../../../offline/syncEngine';
import './LogbookSection.css';
import './LogbookWeeks.css';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const QUEUED_TEXT = 'Saved on this device. It will sync automatically when the connection allows.';

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  returned: 'Returned',
};

function todayValue() {
  return new Date().toLocaleDateString('en-CA');
}

function formatDay(value) {
  if (!value) return '';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function entryHours(entry) {
  if (!entry.start_time || !entry.end_time) return 0;
  const [startHour, startMinute] = entry.start_time.split(':').map(Number);
  const [endHour, endMinute] = entry.end_time.split(':').map(Number);
  return Math.max(0, (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60);
}

function emptyForm() {
  return {
    entryDate: todayValue(),
    startTime: '',
    endTime: '',
    activity: '',
    description: '',
    skillsLearned: '',
    challenges: '',
    toolsUsed: '',
  };
}

export default function LogbookSection({ studentId = null }) {
  const { user } = useAuth();
  const isOwner = !studentId;
  const canReview = Boolean(studentId) && user?.role === 'industry_supervisor';

  const [rawEntries, setRawEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removeIds, setRemoveIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [returning, setReturning] = useState(null);
  const formRef = useRef(null);
  const draftUuidRef = useRef(crypto.randomUUID());
  const records = useOutbox();

  const entries = useMemo(
    () => (isOwner ? applyLogbookOverlay(rawEntries, records) : rawEntries),
    [rawEntries, records, isOwner]
  );

  async function loadEntries() {
    try {
      const res = studentId
        ? await logbooksApi.getStudentLogbook(studentId)
        : await logbooksApi.getMyLogbook();
      setRawEntries(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [studentId]);

  useSyncRefresh(loadEntries);

  const weeks = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      if (!map.has(entry.week_start)) map.set(entry.week_start, []);
      map.get(entry.week_start).push(entry);
    });
    return Array.from(map, ([weekStart, items]) => ({ weekStart, items }));
  }, [entries]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm());
    setFiles([]);
    setFileKey((key) => key + 1);
    setEditingId(null);
    setExistingFiles([]);
    setRemoveIds([]);
    draftUuidRef.current = crypto.randomUUID();
  }

  async function handleFilesChosen(event) {
    const chosen = Array.from(event.target.files || []);
    const kept = existingFiles.filter((file) => !removeIds.includes(file.id)).length;
    const problem = validateFiles(chosen, {
      maxFiles: Math.max(0, MAX_FILES - kept),
      maxBytes: MAX_FILE_BYTES * 3,
      label: 'new file',
    });
    if (problem) {
      setError(problem);
      setFiles([]);
      setFileKey((key) => key + 1);
      return;
    }
    setError('');
    const prepared = await prepareFiles(chosen);
    const oversized = prepared.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) {
      setError(`${oversized.name} is larger than 10 MB after compression`);
      setFiles([]);
      setFileKey((key) => key + 1);
      return;
    }
    setFiles(prepared);
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setForm({
      entryDate: entry.entry_date,
      startTime: entry.start_time || '',
      endTime: entry.end_time || '',
      activity: entry.activity || '',
      description: entry.description || '',
      skillsLearned: entry.skills_learned || '',
      challenges: entry.challenges || '',
      toolsUsed: entry.tools_used || '',
    });
    setExistingFiles(entry.files || []);
    setRemoveIds([]);
    setFiles([]);
    setFileKey((key) => key + 1);
    setError('');
    setMessage('');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function toggleRemove(fileId) {
    setRemoveIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  }

  async function handleSave(submit) {
    setError('');
    setMessage('');

    if (!form.activity.trim()) {
      setError('Describe the task you worked on');
      return;
    }
    if (submit && !form.description.trim()) {
      setError('Add a description before submitting');
      return;
    }
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      setError('The end time must be after the start time');
      return;
    }

    const editingEntry = editingId ? entries.find((entry) => entry.id === editingId) : null;
    const pendingIds = new Set(
      (editingEntry ? editingEntry.files : []).filter((file) => file.pending).map((file) => file.id)
    );
    const removeLocal = removeIds.filter((id) => pendingIds.has(id));
    const removeServer = removeIds.filter((id) => !pendingIds.has(id));

    setSaving(true);
    try {
      let result;
      if (editingEntry && editingEntry._record) {
        result = await actions.amendLogbookRecord(editingEntry._record, {
          fields: form,
          submit,
          addFiles: files,
          removeFileIds: removeLocal,
          removeServerFileIds:
            editingEntry._record.type === 'logbook.update' ? removeServer : undefined,
        });
      } else if (editingEntry) {
        result = await actions.updateLogbookEntry({
          entry: editingEntry,
          fields: form,
          files,
          removeFileIds: removeServer,
          submit,
        });
      } else {
        result = await actions.saveLogbookEntry({
          entryUuid: draftUuidRef.current,
          fields: form,
          files,
          submit,
        });
      }
      if (result.queued) {
        setMessage(QUEUED_TEXT);
      } else {
        setMessage(submit ? 'Entry submitted for review.' : 'Draft saved.');
      }
      resetForm();
      await loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function run(key, action, successText) {
    setBusyKey(key);
    setError('');
    setMessage('');
    try {
      const res = await action();
      if (res.queued) {
        setMessage(QUEUED_TEXT);
      } else {
        setMessage(typeof successText === 'function' ? successText(res.data) : successText);
      }
      await loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  }

  function handleDelete(entry) {
    if (!window.confirm('Delete this draft entry?')) return;
    run(`entry:${entry.id}`, () => actions.deleteLogbookEntry({ entry }), 'Draft deleted.');
  }

  function handleSubmitEntry(entry) {
    run(
      `entry:${entry.id}`,
      () => actions.submitLogbookEntry({ entry }),
      'Entry submitted for review.'
    );
  }

  function handleSubmitWeek(week) {
    if (!window.confirm('Submit all ready entries for this week?')) return;
    run(
      `week:${week.weekStart}`,
      () => actions.submitLogbookWeek({ weekStart: week.weekStart }),
      (data) =>
        `${data.submitted} entr${data.submitted === 1 ? 'y' : 'ies'} submitted${data.skipped ? `, ${data.skipped} skipped for missing descriptions` : ''}.`
    );
  }

  function handleApprove(week) {
    if (!window.confirm('Approve all submitted entries for this week?')) return;
    run(
      `week:${week.weekStart}`,
      () => logbooksApi.reviewLogbookWeek(studentId, week.weekStart, { decision: 'approve' }),
      (data) => `${data.reviewed} entr${data.reviewed === 1 ? 'y' : 'ies'} approved.`
    );
  }

  async function handleReturn(week) {
    if (!returning || !returning.comment.trim()) {
      setError('Add a comment explaining what needs to be fixed');
      return;
    }
    await run(
      `week:${week.weekStart}`,
      () =>
        logbooksApi.reviewLogbookWeek(studentId, week.weekStart, {
          decision: 'return',
          comment: returning.comment,
        }),
      (data) => `${data.reviewed} entr${data.reviewed === 1 ? 'y' : 'ies'} returned to the student.`
    );
    setReturning(null);
  }

  return (
    <Card>
      <h2 className="section-title">Logbook</h2>

      {error && <p className="logbook-error">{error}</p>}
      {message && <p className="logbook-message">{message}</p>}

      {isOwner && (
        <form
          ref={formRef}
          className="logbook-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(true);
          }}
        >
          <label className="logbook-form__field">
            <span>Date</span>
            <input
              type="date"
              value={form.entryDate}
              max={todayValue()}
              onChange={(e) => updateForm('entryDate', e.target.value)}
              required
            />
          </label>

          <div className="logbook-form__row">
            <label className="logbook-form__field">
              <span>Start time</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => updateForm('startTime', e.target.value)}
              />
            </label>
            <label className="logbook-form__field">
              <span>End time</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => updateForm('endTime', e.target.value)}
              />
            </label>
          </div>

          <label className="logbook-form__field">
            <span>Task or activity performed</span>
            <input
              type="text"
              value={form.activity}
              maxLength={500}
              onChange={(e) => updateForm('activity', e.target.value)}
              placeholder="For example, site survey of the east block"
              required
            />
          </label>

          <label className="logbook-form__field">
            <span>Description of the activity</span>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              placeholder="What you did, step by step"
              rows={4}
            />
          </label>

          <label className="logbook-form__field">
            <span>Skills learned (optional)</span>
            <textarea
              value={form.skillsLearned}
              onChange={(e) => updateForm('skillsLearned', e.target.value)}
              rows={2}
            />
          </label>

          <label className="logbook-form__field">
            <span>Challenges encountered (optional)</span>
            <textarea
              value={form.challenges}
              onChange={(e) => updateForm('challenges', e.target.value)}
              rows={2}
            />
          </label>

          <label className="logbook-form__field">
            <span>Materials or tools used (optional)</span>
            <input
              type="text"
              value={form.toolsUsed}
              maxLength={1000}
              onChange={(e) => updateForm('toolsUsed', e.target.value)}
            />
          </label>

          {existingFiles.length > 0 && (
            <div className="logbook-form__existing">
              <strong>Current evidence</strong>
              {existingFiles.map((file) => (
                <label key={file.id}>
                  <input
                    type="checkbox"
                    checked={removeIds.includes(file.id)}
                    onChange={() => toggleRemove(file.id)}
                  />
                  Remove {file.name}
                </label>
              ))}
            </div>
          )}

          <label className="logbook-form__field">
            <span>
              Evidence: photos or documents (optional, up to 5 files of 10 MB; photos are shrunk
              automatically for weak connections)
            </span>
            <input
              key={fileKey}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFilesChosen}
            />
          </label>

          <div className="logbook-form__buttons">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Submit entry'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              Save draft
            </button>
            {editingId && (
              <button type="button" className="btn btn--ghost" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {loading && <p className="logbook-loading">Loading logbook...</p>}

      {!loading && entries.length === 0 && <EmptyState>No logbook entries yet.</EmptyState>}

      {weeks.map((week) => {
        const hours = week.items.reduce((sum, entry) => sum + entryHours(entry), 0);
        const draftCount = week.items.filter((entry) =>
          ['draft', 'returned'].includes(entry.status)
        ).length;
        const submittedCount = week.items.filter((entry) => entry.status === 'submitted').length;
        const weekBusy = busyKey === `week:${week.weekStart}`;

        return (
          <section key={week.weekStart} className="logbook-week">
            <div className="logbook-week__head">
              <div>
                <h3 className="logbook-week__title">Week of {formatDay(week.weekStart)}</h3>
                <span className="logbook-week__meta">
                  {week.items.length} entr{week.items.length === 1 ? 'y' : 'ies'}
                  {hours > 0 ? `, ${hours.toFixed(1)} hours logged` : ''}
                </span>
              </div>

              <div className="logbook-week__actions">
                {isOwner && draftCount > 0 && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => handleSubmitWeek(week)}
                    disabled={Boolean(busyKey)}
                  >
                    {weekBusy ? 'Submitting...' : `Submit week (${draftCount})`}
                  </button>
                )}
                {canReview && submittedCount > 0 && (
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => handleApprove(week)}
                      disabled={Boolean(busyKey)}
                    >
                      {weekBusy ? 'Saving...' : `Approve week (${submittedCount})`}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setReturning({ weekStart: week.weekStart, comment: '' })}
                      disabled={Boolean(busyKey)}
                    >
                      Return week
                    </button>
                  </>
                )}
              </div>
            </div>

            {canReview && returning && returning.weekStart === week.weekStart && (
              <div className="logbook-return">
                <label className="logbook-form__field">
                  <span>What needs to be fixed?</span>
                  <textarea
                    value={returning.comment}
                    onChange={(e) => setReturning({ ...returning, comment: e.target.value })}
                    maxLength={2000}
                  />
                </label>
                <div className="logbook-form__buttons">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => handleReturn(week)}
                    disabled={Boolean(busyKey)}
                  >
                    Return to student
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setReturning(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <ul className="logbook-list">
              {week.items.map((entry) => {
                const entryBusy = busyKey === `entry:${entry.id}`;
                const canEdit = isOwner && ['draft', 'returned'].includes(entry.status);

                return (
                  <li key={entry.id} className="logbook-entry">
                    <div className="logbook-entry__head">
                      <div>
                        <strong className="logbook-entry__date">{formatDay(entry.entry_date)}</strong>
                        {(entry.start_time || entry.end_time) && (
                          <div className="logbook-entry__time">
                            {entry.start_time || '?'} to {entry.end_time || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <StatusBadge>{STATUS_LABELS[entry.status] || entry.status}</StatusBadge>
                        {entry._sync && (
                          <div style={{ marginTop: 6 }}>
                            <SyncChip sync={entry._sync} />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="logbook-entry__task">{entry.activity}</p>

                    <div className="logbook-entry__details">
                      {entry.description && <div>{entry.description}</div>}
                      {entry.skills_learned && (
                        <div>
                          <span className="logbook-entry__label">Skills learned: </span>
                          {entry.skills_learned}
                        </div>
                      )}
                      {entry.challenges && (
                        <div>
                          <span className="logbook-entry__label">Challenges: </span>
                          {entry.challenges}
                        </div>
                      )}
                      {entry.tools_used && (
                        <div>
                          <span className="logbook-entry__label">Tools: </span>
                          {entry.tools_used}
                        </div>
                      )}
                      {entry.notes && <div className="logbook-entry__notes">{entry.notes}</div>}
                    </div>

                    {entry.files && entry.files.length > 0 && (
                      <div className="logbook-entry__files">
                        {entry.files.map((file) =>
                          file.pending ? (
                            <span key={file.id} className="logbook-entry__link">
                              {file.name} (waiting to upload)
                            </span>
                          ) : (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="logbook-entry__link"
                            >
                              {file.name}
                            </a>
                          )
                        )}
                      </div>
                    )}

                    {entry.review_comment && (
                      <div className="logbook-entry__review">{entry.review_comment}</div>
                    )}

                    {isOwner && entry._sync && entry._sync.status === 'failed' && entry._record && (
                      <div className="logbook-entry__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => discardRecord(entry._sync.recordId)}
                        >
                          Discard my local change
                        </button>
                      </div>
                    )}

                    {canEdit && (
                      <div className="logbook-entry__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => startEdit(entry)}
                          disabled={Boolean(busyKey)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => handleSubmitEntry(entry)}
                          disabled={Boolean(busyKey)}
                        >
                          {entryBusy ? 'Submitting...' : entry.status === 'returned' ? 'Resubmit' : 'Submit'}
                        </button>
                        {entry.status === 'draft' && (
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => handleDelete(entry)}
                            disabled={Boolean(busyKey)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Card>
  );
}

