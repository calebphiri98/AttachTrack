import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as resultsApi from '../../../api/results.api';
import '../../../styles/portalSections.css';
import '../../assessments/pages/AssessmentPages.css';

const STAGE_LABELS = {
  incomplete: 'Incomplete',
  ready: 'Ready to compile',
  compiled: 'Compiled',
  sent: 'With HOD',
  approved: 'Approved',
  released: 'Released',
};

const STAGE_CHIPS = {
  incomplete: 'inactive',
  ready: 'draft',
  compiled: 'draft',
  sent: 'none',
  approved: 'submitted',
  released: 'submitted',
};

const FILTERS = [
  { value: 'all', label: 'All students' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'ready', label: 'Ready to compile' },
  { value: 'compiled', label: 'Compiled' },
  { value: 'sent', label: 'With HOD' },
  { value: 'approved', label: 'Approved' },
  { value: 'released', label: 'Released' },
];

const ASSESSMENT_LABELS = {
  not_started: 'Not started',
  draft: 'Draft',
  submitted: 'Submitted',
};

function percentText(value) {
  return value === null || value === undefined ? '-' : `${value}%`;
}

function missingText(row) {
  const missing = [];
  if (row.industry.status !== 'submitted') missing.push('industrial supervisor');
  if (row.university.status !== 'submitted') missing.push('university supervisor');
  return `Waiting for ${missing.join(' and ')}`;
}

function AssessmentCell({ assessment }) {
  return (
    <div>
      <span className={`assess-chip assess-chip--${assessment.status === 'not_started' ? 'none' : assessment.status}`}>
        {ASSESSMENT_LABELS[assessment.status]}
      </span>
      {assessment.status === 'submitted' && (
        <div className="assess-table__muted">{percentText(assessment.percent)}</div>
      )}
    </div>
  );
}

export default function ResultsCompilePage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      const res = await resultsApi.getCompileOverview();
      setOverview(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(key, action, successText) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      const res = await action();
      setMessage(typeof successText === 'function' ? successText(res.data) : successText);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  const students = overview?.students || [];
  const forms = overview?.forms;

  const count = (stage) => students.filter((row) => row.stage === stage).length;
  const compilable = students.filter((row) => row.stage === 'ready' || row.needs_recompile).length;
  const sendable = students.filter((row) => row.stage === 'compiled' && !row.needs_recompile).length;
  const releasable = count('approved');

  function handleCompile(row) {
    run(
      `row:${row.student_id}`,
      () => resultsApi.compileResult(row.student_id),
      `Result compiled for ${row.name}.`
    );
  }

  function handleRemind(row) {
    run(
      `row:${row.student_id}`,
      () => resultsApi.remindAssessors(row.student_id),
      (data) => `Reminder sent to ${data.notified} supervisor${data.notified === 1 ? '' : 's'}.`
    );
  }

  function handleCompileAll() {
    run(
      'bulk:compile',
      () => resultsApi.compileAllResults(),
      (data) => `${data.compiled} compiled${data.failed ? `, ${data.failed} failed` : ''}.`
    );
  }

  function handleSend() {
    const confirmed = window.confirm(
      `Send ${sendable} compiled result${sendable === 1 ? '' : 's'} to the Head of Department for approval?`
    );
    if (!confirmed) return;
    run(
      'bulk:send',
      () => resultsApi.sendResultsToHod(),
      (data) => `${data.sent} result${data.sent === 1 ? '' : 's'} sent to the HOD.`
    );
  }

  function handleRelease(row) {
    const confirmed = window.confirm(
      `Release the result for ${row.name}? The student will see it immediately.`
    );
    if (!confirmed) return;
    run(
      `row:${row.student_id}`,
      () => resultsApi.releaseResult(row.result.id),
      `Result released for ${row.name}.`
    );
  }

  function handleReleaseAll() {
    const confirmed = window.confirm(
      `Release ${releasable} approved result${releasable === 1 ? '' : 's'} to students? They will see them immediately.`
    );
    if (!confirmed) return;
    run(
      'bulk:release',
      () => resultsApi.releaseAllResults(),
      (data) => `${data.released} result${data.released === 1 ? '' : 's'} released.`
    );
  }

  const term = search.trim().toLowerCase();
  const visible = students.filter((row) => {
    if (filter !== 'all' && row.stage !== filter) return false;
    if (!term) return true;
    return row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term);
  });

  const stats = [
    { label: 'Students', value: students.length },
    { label: 'Incomplete', value: count('incomplete') },
    { label: 'Ready to compile', value: compilable },
    { label: 'Compiled', value: count('compiled') },
    { label: 'With HOD', value: count('sent') },
    { label: 'Approved', value: count('approved') },
    { label: 'Released', value: count('released') },
  ];

  return (
    <PortalLayout
      eyebrow="End of semester"
      title="Compile results"
      actions={
        <>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleCompileAll}
            disabled={Boolean(busy) || compilable === 0 || !forms?.ready}
          >
            {busy === 'bulk:compile' ? 'Compiling...' : `Compile all ready (${compilable})`}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSend}
            disabled={Boolean(busy) || sendable === 0}
          >
            {busy === 'bulk:send' ? 'Sending...' : `Send to HOD (${sendable})`}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleReleaseAll}
            disabled={Boolean(busy) || releasable === 0}
          >
            {busy === 'bulk:release' ? 'Releasing...' : `Release approved (${releasable})`}
          </button>
        </>
      }
    >
      {error && <p className="assess-error">{error}</p>}
      {message && <p className="assess-banner assess-banner--ok">{message}</p>}
      {loading && <p className="assess-empty">Loading results...</p>}

      {forms && !forms.ready && (
        <p className="assess-banner">
          {forms.message} Results cannot be compiled until this is fixed.{' '}
          <Link to="/assessments/forms">Open assessment forms</Link>
        </p>
      )}

      {overview && (
        <>
          <div className="stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <div className="stat-card__label">{stat.label}</div>
                <div className="stat-card__value">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="assess-card">
            <h2 className="assess-card__title">Student results</h2>
            <p className="assess-card__hint">
              The final result is {forms.weights.industry}% industrial supervisor and{' '}
              {forms.weights.university}% university supervisor. Compile when both assessments are
              submitted, then send to the Head of Department for approval.
            </p>

            <div className="assess-grid">
              <label className="assess-field">
                <span>Search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or email"
                />
              </label>
              <label className="assess-field">
                <span>Stage</span>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  {FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="assess-empty">No students match.</p>
          ) : (
            <div className="assess-table-wrap">
              <table className="assess-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Industrial</th>
                    <th>University</th>
                    <th>Final result</th>
                    <th>Stage</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const rowBusy = busy === `row:${row.student_id}`;
                    return (
                      <tr key={row.student_id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.name}</div>
                          <div className="assess-table__muted">{row.programme || row.email}</div>
                        </td>
                        <td>
                          <AssessmentCell assessment={row.industry} />
                        </td>
                        <td>
                          <AssessmentCell assessment={row.university} />
                        </td>
                        <td>{row.result ? percentText(row.result.final_percent) : '-'}</td>
                        <td>
                          <span className={`assess-chip assess-chip--${STAGE_CHIPS[row.stage]}`}>
                            {STAGE_LABELS[row.stage]}
                          </span>
                          {row.needs_recompile && (
                            <div className="assess-table__muted">An assessment changed. Recompile.</div>
                          )}
                        </td>
                        <td>
                          {row.stage === 'incomplete' && (
                            <div>
                              <button
                                type="button"
                                className="btn btn--ghost"
                                onClick={() => handleRemind(row)}
                                disabled={Boolean(busy)}
                              >
                                {rowBusy ? 'Sending...' : 'Remind'}
                              </button>
                              <div className="assess-table__muted">{missingText(row)}</div>
                            </div>
                          )}
                          {row.stage === 'ready' && (
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => handleCompile(row)}
                              disabled={Boolean(busy) || !forms.ready}
                            >
                              {rowBusy ? 'Compiling...' : 'Compile'}
                            </button>
                          )}
                          {row.stage === 'compiled' && (
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => handleCompile(row)}
                              disabled={Boolean(busy) || !forms.ready}
                            >
                              {rowBusy ? 'Compiling...' : 'Recompile'}
                            </button>
                          )}
                          {row.stage === 'sent' && (
                            <span className="assess-table__muted">Waiting for the HOD</span>
                          )}
                          {row.stage === 'approved' && (
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => handleRelease(row)}
                              disabled={Boolean(busy)}
                            >
                              {rowBusy ? 'Releasing...' : 'Release'}
                            </button>
                          )}
                          {row.stage === 'released' && (
                            <span className="assess-table__muted">
                              {new Date(row.result.released_at).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}