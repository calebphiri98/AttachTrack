import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as assessmentsApi from '../../../api/assessments.api';
import './AssessmentPages.css';

const EYEBROWS = {
  industry: 'Industrial supervisor',
  university: 'University supervisor',
};

function toDraft(data) {
  const marks = {};
  const remarks = {};
  data.items.forEach((item) => {
    marks[item.criterion_id] = item.marks === null || item.marks === undefined ? '' : String(item.marks);
    remarks[item.criterion_id] = item.remark || '';
  });
  return { marks, remarks, comments: data.comments || '' };
}

export default function AssessmentFormPage({ kind }) {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function applyData(next) {
    const draft = toDraft(next);
    setData(next);
    setMarks(draft.marks);
    setRemarks(draft.remarks);
    setComments(draft.comments);
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    assessmentsApi
      .getAssessment(kind, studentId)
      .then((res) => applyData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [kind, studentId]);

  const locked = data?.status === 'submitted';
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
      const res = await assessmentsApi.saveAssessment(kind, studentId, buildPayload(submit));
      applyData(res.data);
      setMessage(submit ? 'Assessment submitted.' : 'Draft saved.');
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
          {locked && (
            <p className="assess-banner assess-banner--ok">
              This assessment was submitted on {new Date(data.submittedAt).toLocaleDateString()} and
              can no longer be changed.
            </p>
          )}
          {message && <p className="assess-banner assess-banner--ok">{message}</p>}

          <div className="assess-card">
            <h2 className="assess-card__title">{data.form.title}</h2>
            <div className="assess-summary">
              <span>Student: {data.student.name}</span>
              {data.student.programme && <span>Programme: {data.student.programme}</span>}
              <span>Status: {locked ? 'Submitted' : data.status === 'draft' ? 'Draft saved' : 'Not started'}</span>
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
                    onChange={(e) => setMarks((prev) => ({ ...prev, [item.criterion_id]: e.target.value }))}
                    disabled={locked || saving}
                    aria-label={`Marks for ${item.label}`}
                  />
                  <span>/ {item.max_marks}</span>
                </div>
                <label className="assess-criterion__remark">
                  <input
                    value={remarks[item.criterion_id] ?? ''}
                    onChange={(e) => setRemarks((prev) => ({ ...prev, [item.criterion_id]: e.target.value }))}
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
                onChange={(e) => setComments(e.target.value)}
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