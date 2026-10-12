import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as resultsApi from '../../../api/results.api';
import '../../../styles/portalSections.css';
import '../../admin/pages/AdminDashboardPage.css';

const STATUS_LABELS = {
  ready: 'Ready to release',
  released: 'Released',
  not_graded: 'Not graded',
};

const STATUS_COLORS = {
  ready: 'var(--ink)',
  released: 'var(--stamp)',
  not_graded: 'var(--muted)',
};

const FILTERS = [
  { value: 'all', label: 'All students' },
  { value: 'ready', label: 'Ready to release' },
  { value: 'released', label: 'Released' },
  { value: 'not_graded', label: 'Not graded' },
];

export default function ResultsReleasePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [releasingAll, setReleasingAll] = useState(false);

  async function loadRows() {
    try {
      const res = await resultsApi.getResultsOverview();
      setRows(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  const readyCount = rows.filter((row) => row.status === 'ready').length;
  const releasedCount = rows.filter((row) => row.status === 'released').length;
  const gradedCount = readyCount + releasedCount;

  async function handleRelease(row) {
    const confirmed = window.confirm(
      `Release the result for ${row.name}? The student will see it immediately and it can no longer be edited.`
    );
    if (!confirmed) return;

    setBusyId(row.student_id);
    setError('');
    setMessage('');
    try {
      await resultsApi.releaseResult(row.student_id);
      setMessage(`Result released for ${row.name}.`);
      await loadRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReleaseAll() {
    if (readyCount === 0) return;
    const confirmed = window.confirm(
      `Release ${readyCount} result${readyCount === 1 ? '' : 's'} to students? They will see them immediately and the grades can no longer be edited.`
    );
    if (!confirmed) return;

    setReleasingAll(true);
    setError('');
    setMessage('');
    try {
      const res = await resultsApi.releaseAllResults();
      setMessage(`${res.data.released} result${res.data.released === 1 ? '' : 's'} released.`);
      await loadRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setReleasingAll(false);
    }
  }

  const term = search.trim().toLowerCase();
  const visible = rows.filter((row) => {
    if (filter !== 'all' && row.status !== filter) return false;
    if (!term) return true;
    return row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term);
  });

  const stats = [
    { label: 'Students', value: rows.length },
    { label: 'Graded', value: gradedCount },
    { label: 'Ready to release', value: readyCount },
    { label: 'Released', value: releasedCount },
  ];

  return (
    <PortalLayout
      eyebrow="End of semester"
      title="Release results"
      actions={
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleReleaseAll}
          disabled={releasingAll || readyCount === 0}
        >
          {releasingAll ? 'Releasing...' : `Release all ready (${readyCount})`}
        </button>
      }
    >
      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-result__note">{message}</p>}
      {loading && <p className="admin-empty">Loading results...</p>}

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

          <section className="admin-panel">
            <h2 className="admin-panel__title">Student results</h2>
            <p className="admin-panel__hint">
              Students only see their final result after you release it. A released result is locked.
            </p>

            <div className="admin-form">
              <label className="inline-form__field">
                <span>Search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or email"
                />
              </label>
              <label className="inline-form__field">
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

            {visible.length === 0 ? (
              <p className="admin-empty">No students match.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>University supervisor</th>
                      <th>Grade</th>
                      <th>Final score</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => (
                      <tr key={row.student_id}>
                        <td data-label="Student">
                          <div>
                            <div style={{ fontWeight: 700 }}>{row.name}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{row.email}</div>
                          </div>
                        </td>
                        <td data-label="University supervisor">
                          {row.university_supervisor_name || 'Unassigned'}
                        </td>
                        <td data-label="Grade">{row.grade_value || '-'}</td>
                        <td data-label="Final score">
                          {row.computed_final_score != null ? row.computed_final_score : '-'}
                        </td>
                        <td data-label="Status">
                          <span style={{ fontWeight: 700, color: STATUS_COLORS[row.status] }}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        <td data-label="Action">
                          {row.status === 'ready' && (
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => handleRelease(row)}
                              disabled={busyId === row.student_id || releasingAll}
                            >
                              {busyId === row.student_id ? 'Releasing...' : 'Release'}
                            </button>
                          )}
                          {row.status === 'released' && (
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                              {new Date(row.released_at).toLocaleDateString()}
                            </span>
                          )}
                          {row.status === 'not_graded' && (
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </PortalLayout>
  );
}