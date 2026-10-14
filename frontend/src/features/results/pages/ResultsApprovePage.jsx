import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as resultsApi from '../../../api/results.api';
import '../../../styles/portalSections.css';
import '../../assessments/pages/AssessmentPages.css';

const STAGE_LABELS = {
  awaiting: 'Awaiting approval',
  approved: 'Approved',
  released: 'Released',
};

const STAGE_CHIPS = {
  awaiting: 'draft',
  approved: 'submitted',
  released: 'submitted',
};

const FILTERS = [
  { value: 'all', label: 'All results' },
  { value: 'awaiting', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'released', label: 'Released' },
];

export default function ResultsApprovePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      const res = await resultsApi.getHodResults();
      setRows(res.data);
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

  const awaiting = rows.filter((row) => row.stage === 'awaiting').length;
  const approved = rows.filter((row) => row.stage === 'approved').length;
  const released = rows.filter((row) => row.stage === 'released').length;

  function handleApprove(row) {
    const confirmed = window.confirm(
      `Approve the result for ${row.name} (${row.final_percent}%)? It can no longer be recompiled afterwards.`
    );
    if (!confirmed) return;
    run(`row:${row.id}`, () => resultsApi.approveResult(row.id), `Result approved for ${row.name}.`);
  }

  function handleApproveAll() {
    const confirmed = window.confirm(
      `Approve ${awaiting} result${awaiting === 1 ? '' : 's'}? They can no longer be recompiled afterwards.`
    );
    if (!confirmed) return;
    run(
      'bulk:approve',
      () => resultsApi.approveAllResults(),
      (data) => `${data.approved} result${data.approved === 1 ? '' : 's'} approved.`
    );
  }

  function handleRelease(row) {
    const confirmed = window.confirm(
      `Release the result for ${row.name}? The student will see it immediately.`
    );
    if (!confirmed) return;
    run(`row:${row.id}`, () => resultsApi.releaseResult(row.id), `Result released for ${row.name}.`);
  }

  function handleReleaseAll() {
    const confirmed = window.confirm(
      `Release ${approved} approved result${approved === 1 ? '' : 's'} to students? They will see them immediately.`
    );
    if (!confirmed) return;
    run(
      'bulk:release',
      () => resultsApi.releaseAllResults(),
      (data) => `${data.released} result${data.released === 1 ? '' : 's'} released.`
    );
  }

  const term = search.trim().toLowerCase();
  const visible = rows.filter((row) => {
    if (filter !== 'all' && row.stage !== filter) return false;
    if (!term) return true;
    return row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term);
  });

  const stats = [
    { label: 'Sent by Coordinator', value: rows.length },
    { label: 'Awaiting approval', value: awaiting },
    { label: 'Approved', value: approved },
    { label: 'Released', value: released },
  ];

  return (
    <PortalLayout
      eyebrow="Head of Department"
      title="Approve results"
      actions={
        <>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleApproveAll}
            disabled={Boolean(busy) || awaiting === 0}
          >
            {busy === 'bulk:approve' ? 'Approving...' : `Approve all (${awaiting})`}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleReleaseAll}
            disabled={Boolean(busy) || approved === 0}
          >
            {busy === 'bulk:release' ? 'Releasing...' : `Release approved (${approved})`}
          </button>
        </>
      }
    >
      {error && <p className="assess-error">{error}</p>}
      {message && <p className="assess-banner assess-banner--ok">{message}</p>}
      {loading && <p className="assess-empty">Loading results...</p>}

      {!loading && (
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
            <h2 className="assess-card__title">Compiled results</h2>
            <p className="assess-card__hint">
              You see only results the Coordinator has sent for approval. Approving locks a result,
              and releasing it makes it visible to the student.
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
                <span>Status</span>
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
            <p className="assess-empty">
              {rows.length === 0 ? 'No results have been sent to you yet.' : 'No results match.'}
            </p>
          ) : (
            <div className="assess-table-wrap">
              <table className="assess-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Industrial</th>
                    <th>University</th>
                    <th>Final result</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const rowBusy = busy === `row:${row.id}`;
                    return (
                      <tr key={row.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.name}</div>
                          <div className="assess-table__muted">{row.programme || row.email}</div>
                        </td>
                        <td>{row.industry_percent}%</td>
                        <td>{row.university_percent}%</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.final_percent}%</div>
                          <div className="assess-table__muted">
                            {row.industry_weight}% + {row.university_weight}% weights
                          </div>
                        </td>
                        <td>
                          <span className={`assess-chip assess-chip--${STAGE_CHIPS[row.stage]}`}>
                            {STAGE_LABELS[row.stage]}
                          </span>
                        </td>
                        <td>
                          {row.stage === 'awaiting' && (
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => handleApprove(row)}
                              disabled={Boolean(busy)}
                            >
                              {rowBusy ? 'Approving...' : 'Approve'}
                            </button>
                          )}
                          {row.stage === 'approved' && (
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => handleRelease(row)}
                              disabled={Boolean(busy)}
                            >
                              {rowBusy ? 'Releasing...' : 'Release'}
                            </button>
                          )}
                          {row.stage === 'released' && (
                            <span className="assess-table__muted">
                              {new Date(row.released_at).toLocaleDateString()}
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