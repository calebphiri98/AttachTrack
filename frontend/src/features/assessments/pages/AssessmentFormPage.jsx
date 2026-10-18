import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import SyncChip from '../../../components/shared/SyncChip';
import { useAuth } from '../../../context/AuthContext';
import * as assessmentsApi from '../../../api/assessments.api';
import * as actions from '../../../offline/actions';
import { useOutbox, useSyncRefresh } from '../../../offline/hooks';
import { listRecords } from '../../../offline/outbox';
import { pendingAssessment, syncInfo } from '../../../offline/overlays';
import { discardRecord } from '../../../offline/syncEngine';
import './AssessmentPages.css';

const EYEBROWS = {
  industry: 'Industrial supervisor',
  university: 'University supervisor',
};

function toDraft(data, pending) {
  const marks = {};
  const remarks = {};
  data.items.forEach((item) => {
    marks[item.criterion_id] = item.marks === null || item.marks === undefined ? '' : String(item.marks);
    remarks[item.criterion_id] = item.remark || '';
  });
  let comments = data.comments || '';

  if (pending && data.status !== 'submitted') {
    data.items.forEach((item) => {
      marks[item.criterion_id] = '';
      remarks[item.criterion_id] = '';
    });
    (pending.payload.scores || []).forEach((score) => {
      marks[score.criterionId] = String(score.marks);
      remarks[score.criterionId] = score.remark || '';
    });
    comments = pending.payload.comments || '';
  }

  return { marks, remarks, comments };
}

export default function AssessmentFormPage({ kind }) {
  const { studentId } = useParams();
  const { user } = useAuth();
  const outbox = useOutbox();
  const pending = useMemo(() => pendingAssessment(outbox, kind, studentId), [outbox, kind, studentId]);
  const [data, setData] = useState(null);
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dirtyRef = useRef(false);

  function applyData(next, pendingRecord = null) {
    const draft = toDraft(next, pendingRecord);
    dirtyRef.current = false;
    setData(next);
    setMarks(draft.marks);
    setRemarks(draft.remarks);
    setComments(draft.comments);
  }

  async function load() {
    try {
      const [res, records] = await Promise.all([
        assessmentsApi.getAssessment(kind, studentId),
        listRecords({ userId: user ? user.id : null }),
      ]);
      applyData(res.data, pendingAssessment(records, kind, studentId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    load();
  }, [kind, studentId]);

  useSyncRefresh(() => {
    if (!dirtyRef.current) load();
  });

  const locked = data?.status === 'submitted' || Boolean(pending && pending.payload.submit);
  const lockedByServer = data?.status === 'submitted';
  const items = data?.items || [];
  const maxTotal = items.reduce((sum, item) => sum + item.max_marks, 0);
  const enteredTotal = items.reduce((sum, item) => {
    const value = marks[item.criterion_id];
    return value === '' || value === undefined ? sum : sum + Number(value);
  }, 0);
  const missingCount = items.filter(
    (item) => marks[item.criterion_id] === '' || marks[item.criterion_id] === undefined
  ).length;

  function validate(requireAll) {
    for (const item of items) {
      const raw = marks[item.criterion_id];
      if (raw === '' || raw === undefined) {
        if (requireAll) return `Enter marks for "${item.label}"`;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > item.max_marks) {
        return `"${item.label}" must be between 0 and ${item.max_marks}`;
      }
    }
    return '';
  }

  function buildPayload(submit) {
    return {
      scores: items
        .filter((item) => marks[item.criterion_id] !== '' && marks[item.criterion_id] !== undefined)
        .map((item) => ({
          criterionId: item.criterion_id,
          marks: Number(marks[item.criterion_id]),
          remark: remarks[item.criterion_id] || '',
        })),
      comments,
      submit,
    };
  }

  async function handleSave(submit) {
    setError('');
    setMessage('');

    const problem = validate(submit);
    if (problem) {
      setError(problem);
      return;
    }

    if (submit) {
      const confirmed = window.confirm(
        'Submit this assessment? You will not be able to change it afterwards.'
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const result = await actions.saveAssessment({
        kind,
        studentId,
        studentName: data ? data.student.name : '',
        ...buildPayload(submit),
      });
      if (result.queued) {
        setMessage(
          submit
            ? 'Submission saved on this device. It will be sent when the connection allows, and cannot be changed afterwards.'
            : 'Draft saved on this device. It will sync automatically.'
        );
      } else {
        applyData(result.data);
        setMessage(submit ? 'Assessment submitted.' : 'Draft saved.');
      }
      dirtyRef.current = false;
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalLayout
      eyebrow={EYEBROWS[kind]}
      title={data ? `Assessment: ${data.student.name}` : 'Assessment'}
      actions={
        <Link to={`/${kind}/assessments`} className="btn btn--ghost">
          Back to students
        </Link>
      }
    >
      {error && <p className="assess-error">{error}</p>}
      {loading && <p className="assess-empty">Loading assessment...</p>}

      {data && (
        <>
          {!data.form.confirmed && !locked && (
            <p className="assess-banner">
              The assessment form has not been confirmed by the Coordinator yet. You can save a
              draft, but you cannot submit until it is confirmed.
            </p>
          )}
          {lockedByServer && (
            <p className="assess-banner assess-banner--ok">
              This assessment was submitted on {new Date(data.submittedAt).toLocaleDateString()} and
              can no longer be changed.
            </p>
          )}
          {pending && !lockedByServer && (
            <div className="assess-banner">
              <SyncChip sync={syncInfo(pending)} />
              {pending.status === 'failed' && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => discardRecord(pending.id)}
                >
                  Discard my local copy
                </button>
              )}
            </div>
          )}
          {message && <p className="assess-banner assess-banner--ok">{message}</p>}

          <div className="assess-card">
            <h2 className="assess-card__title">{data.form.title}</h2>
            <div className="assess-summary">
              <span>Student: {data.student.name}</span>
              {data.student.programme && <span>Programme: {data.student.programme}</span>}
              <span>
                Status:{' '}
                {locked
                  ? lockedByServer
                    ? 'Submitted'
                    : 'Submitted (waiting to sync)'
                  : data.status === 'draft' || pending
                    ? 'Draft saved'
                    : 'Not started'}
              </span>
            </div>

            {items.length === 0 && (
              <p className="assess-empty">No assessment criteria have been set up yet.</p>
            )}

            {items.map((item) => (
              <div key={item.criterion_id} className="assess-criterion">
                <div>
                  <div className="assess-criterion__label">{item.label}</div>
                  {item.description && <div className="assess-criterion__desc">{item.description}</div>}
                </div>
                <div className="assess-criterion__score">
                  <input
                    type="number"
                    min="0"
                    max={item.max_marks}
                    step="0.5"
                    inputMode="decimal"
                    value={marks[item.criterion_id] ?? ''}
                    onChange={(e) => {
                      dirtyRef.current = true;
                      setMarks((prev) => ({ ...prev, [item.criterion_id]: e.target.value }));
                    }}
                    disabled={locked || saving}
                    aria-label={`Marks for ${item.label}`}
                  />
                  <span>/ {item.max_marks}</span>
                </div>
                <label className="assess-criterion__remark">
                  <input
                    value={remarks[item.criterion_id] ?? ''}
                    onChange={(e) => {
                      dirtyRef.current = true;
                      setRemarks((prev) => ({ ...prev, [item.criterion_id]: e.target.value }));
                    }}
                    placeholder="Remark (optional)"
                    maxLength={500}
                    disabled={locked || saving}
                    aria-label={`Remark for ${item.label}`}
                  />
                </label>
              </div>
            ))}

            {items.length > 0 && (
              <div className="assess-total">
                <span>{locked ? 'Final score' : 'Total so far'}</span>
                <strong>
                  {locked && data.totalMarks !== null ? data.totalMarks : enteredTotal} /{' '}
                  {locked && data.maxTotal !== null ? data.maxTotal : maxTotal}
                </strong>
              </div>
            )}

            <label className="assess-field">
              <span>Overall comments (optional)</span>
              <textarea
                value={comments}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setComments(e.target.value);
                }}
                maxLength={3000}
                disabled={locked || saving}
              />
            </label>

            {!locked && items.length > 0 && (
              <div className="assess-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save draft'}
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => handleSave(true)}
                  disabled={saving || missingCount > 0 || !data.form.confirmed}
                  title={
                    !data.form.confirmed
                      ? 'The form has not been confirmed yet'
                      : missingCount > 0
                        ? `${missingCount} criteria still need marks`
                        : undefined
                  }
                >
                  Submit assessment
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
}

