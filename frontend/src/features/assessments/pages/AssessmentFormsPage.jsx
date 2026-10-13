import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as assessmentsApi from '../../../api/assessments.api';
import './AssessmentPages.css';

const KIND_OPTIONS = [
  { value: 'industry', label: 'Industrial supervisor assessment' },
  { value: 'university', label: 'University supervisor assessment' },
];

const EMPTY_CRITERION = { label: '', description: '', maxMarks: '' };

export default function AssessmentFormsPage() {
  const [forms, setForms] = useState([]);
  const [kind, setKind] = useState('industry');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [settings, setSettings] = useState({ title: '', weightPercent: '' });
  const [criterionForm, setCriterionForm] = useState(EMPTY_CRITERION);
  const [editingId, setEditingId] = useState(null);

  const form = forms.find((item) => item.kind === kind);
  const totalWeight = forms.reduce((sum, item) => sum + item.weight_percent, 0);
  const activeCriteria = form ? form.criteria.filter((criterion) => criterion.is_active) : [];
  const activeMax = activeCriteria.reduce((sum, criterion) => sum + criterion.max_marks, 0);

  useEffect(() => {
    assessmentsApi
      .listAssessmentForms()
      .then((res) => setForms(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (form) {
      setSettings({ title: form.title, weightPercent: String(form.weight_percent) });
    }
  }, [form?.id, form?.title, form?.weight_percent]);

  function replaceForm(updated) {
    setForms((prev) => prev.map((item) => (item.kind === updated.kind ? updated : item)));
  }

  async function run(action, successMessage) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await action();
      replaceForm(res.data);
      if (successMessage) setMessage(successMessage);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleKindChange(value) {
    setKind(value);
    setEditingId(null);
    setCriterionForm(EMPTY_CRITERION);
    setError('');
    setMessage('');
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    run(
      () =>
        assessmentsApi.updateFormSettings(kind, {
          title: settings.title,
          weightPercent: settings.weightPercent,
        }),
      'Form settings saved. The form needs to be confirmed again.'
    );
  }

  async function handleSubmitCriterion(e) {
    e.preventDefault();
    const ok = editingId
      ? await run(
          () =>
            assessmentsApi.updateCriterion(editingId, {
              label: criterionForm.label,
              description: criterionForm.description,
              maxMarks: criterionForm.maxMarks,
            }),
          'Criterion updated. The form needs to be confirmed again.'
        )
      : await run(
          () => assessmentsApi.addCriterion(kind, criterionForm),
          'Criterion added. The form needs to be confirmed again.'
        );

    if (ok) {
      setCriterionForm(EMPTY_CRITERION);
      setEditingId(null);
    }
  }

  function startEdit(criterion) {
    setEditingId(criterion.id);
    setCriterionForm({
      label: criterion.label,
      description: criterion.description || '',
      maxMarks: String(criterion.max_marks),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setCriterionForm(EMPTY_CRITERION);
  }

  function handleToggle(criterion) {
    run(
      () => assessmentsApi.updateCriterion(criterion.id, { isActive: !criterion.is_active }),
      criterion.is_active ? 'Criterion deactivated.' : 'Criterion reactivated.'
    );
  }

  function handleDelete(criterion) {
    if (!window.confirm(`Delete "${criterion.label}"?`)) return;
    run(() => assessmentsApi.deleteCriterion(criterion.id), 'Criterion deleted.');
  }

  function handleConfirm() {
    const confirmed = window.confirm(
      'Confirm this form as the department-approved form? Industrial supervisors can submit assessments only on a confirmed form.'
    );
    if (!confirmed) return;
    run(() => assessmentsApi.confirmForm(kind), 'Form confirmed.');
  }

  return (
    <PortalLayout eyebrow="Results" title="Assessment forms">
      {error && <p className="assess-error">{error}</p>}
      {loading && <p className="assess-empty">Loading forms...</p>}

      {!loading && form && (
        <>
          <div className="assess-card">
            <div className="assess-grid">
              <label className="assess-field">
                <span>Form</span>
                <select value={kind} onChange={(e) => handleKindChange(e.target.value)}>
                  {KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {form.confirmed_at ? (
            <p className="assess-banner assess-banner--ok">
              This form is confirmed. Any change to its title, weight or criteria cancels the
              confirmation until you confirm it again.
            </p>
          ) : (
            <p className="assess-banner">
              This form is not confirmed. Industrial supervisors can save drafts but cannot submit.
              Replace any sample items with the department's form, then press Confirm.
            </p>
          )}

          <form className="assess-card" onSubmit={handleSaveSettings}>
            <h2 className="assess-card__title">Form settings</h2>
            <p className="assess-card__hint">
              The weight is this form's share of the final result. The two weights must add up to
              100%. Right now they add up to {totalWeight}%.
            </p>
            <div className="assess-grid">
              <label className="assess-field">
                <span>Title</span>
                <input
                  value={settings.title}
                  onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))}
                  maxLength={200}
                  required
                />
              </label>
              <label className="assess-field">
                <span>Weight in final result (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.weightPercent}
                  onChange={(e) => setSettings((prev) => ({ ...prev, weightPercent: e.target.value }))}
                  required
                />
              </label>
            </div>
            <div className="assess-actions">
              <button type="submit" className="btn btn--primary" disabled={busy}>
                Save settings
              </button>
            </div>
          </form>

          <div className="assess-card">
            <h2 className="assess-card__title">Criteria</h2>
            <p className="assess-card__hint">
              Active criteria add up to {activeMax} marks. A criterion with recorded marks can be
              deactivated but not deleted.
            </p>

            {form.criteria.length === 0 ? (
              <p className="assess-empty">No criteria yet. Add the first one below.</p>
            ) : (
              <div className="assess-table-wrap">
                <table className="assess-table">
                  <thead>
                    <tr>
                      <th>Criterion</th>
                      <th>Max marks</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.criteria.map((criterion) => (
                      <tr key={criterion.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{criterion.label}</div>
                          {criterion.description && (
                            <div className="assess-table__muted">{criterion.description}</div>
                          )}
                        </td>
                        <td>{criterion.max_marks}</td>
                        <td>
                          <span
                            className={`assess-chip assess-chip--${criterion.is_active ? 'active' : 'inactive'}`}
                          >
                            {criterion.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td>
                          <div className="assess-table__actions">
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => startEdit(criterion)}
                              disabled={busy}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => handleToggle(criterion)}
                              disabled={busy}
                            >
                              {criterion.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                            {!criterion.in_use && (
                              <button
                                type="button"
                                className="btn btn--ghost"
                                onClick={() => handleDelete(criterion)}
                                disabled={busy}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <form className="assess-card" onSubmit={handleSubmitCriterion}>
            <h2 className="assess-card__title">{editingId ? 'Edit criterion' : 'Add criterion'}</h2>
            <p className="assess-card__hint">
              Marks already given keep the name and maximum they were given under.
            </p>
            <div className="assess-grid">
              <label className="assess-field">
                <span>Name</span>
                <input
                  value={criterionForm.label}
                  onChange={(e) => setCriterionForm((prev) => ({ ...prev, label: e.target.value }))}
                  maxLength={200}
                  required
                />
              </label>
              <label className="assess-field">
                <span>Maximum marks</span>
                <input
                  type="number"
                  min="0.5"
                  max="999"
                  step="0.5"
                  value={criterionForm.maxMarks}
                  onChange={(e) => setCriterionForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                  required
                />
              </label>
              <label className="assess-field" style={{ gridColumn: '1 / -1' }}>
                <span>Description (optional)</span>
                <input
                  value={criterionForm.description}
                  onChange={(e) => setCriterionForm((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={1000}
                />
              </label>
            </div>
            <div className="assess-actions">
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {editingId ? 'Update criterion' : 'Add criterion'}
              </button>
              {editingId && (
                <button type="button" className="btn btn--ghost" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="assess-card">
            <h2 className="assess-card__title">Confirm form</h2>
            <p className="assess-card__hint">
              Confirm once the criteria, marks and weights match the department's approved form.
            </p>
            {message && <p className="assess-banner assess-banner--ok">{message}</p>}
            <div className="assess-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleConfirm}
                disabled={busy || Boolean(form.confirmed_at) || activeCriteria.length === 0}
              >
                {form.confirmed_at ? 'Confirmed' : 'Confirm this form'}
              </button>
            </div>
          </div>
        </>
      )}
    </PortalLayout>
  );
}