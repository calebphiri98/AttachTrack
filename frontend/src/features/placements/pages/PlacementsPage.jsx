import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import AllocationCell from '../components/AllocationCell';
import { useAuth } from '../../../context/AuthContext';
import * as placementsApi from '../../../api/placements.api';
import * as companiesApi from '../../../api/companies.api';
import '../../../styles/portalSections.css';
import '../../admin/pages/AdminDashboardPage.css';

const STATUS_LABELS = {
  unallocated: 'Unallocated',
  allocated: 'Awaiting confirmation',
  confirmed: 'Confirmed',
};

const STATUS_COLORS = {
  unallocated: 'var(--muted)',
  allocated: 'var(--ink)',
  confirmed: 'var(--stamp)',
};

const FILTERS = [
  { value: 'all', label: 'All students' },
  { value: 'unallocated', label: 'Unallocated' },
  { value: 'allocated', label: 'Awaiting confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
];

export default function PlacementsPage() {
  const { user } = useAuth();
  const isHod = user?.role === 'hod';

  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function loadAll() {
    try {
      const overview = await placementsApi.getPlacementOverview();
      setRows(overview.data);
      if (!isHod) {
        const companyList = await companiesApi.listCompanies();
        setCompanies(companyList.data);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const unallocatedCount = rows.filter((row) => row.status === 'unallocated').length;
  const awaitingCount = rows.filter((row) => row.status === 'allocated').length;
  const confirmedCount = rows.filter((row) => row.status === 'confirmed').length;

  async function handleAllocate(studentId, payload) {
    setBusyId(studentId);
    setError('');
    setMessage('');
    try {
      await placementsApi.allocatePlacement({ studentId, ...payload });
      setMessage('Placement saved.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(row) {
    if (!window.confirm(`Remove the allocation for ${row.name}?`)) return;
    setBusyId(row.student_id);
    setError('');
    setMessage('');
    try {
      await placementsApi.removeAllocation(row.student_id);
      setMessage(`Allocation removed for ${row.name}.`);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirm(row) {
    const confirmed = window.confirm(
      `Confirm ${row.name} at ${row.company_name}? The student and both supervisors will be notified, and the placement can no longer be changed.`
    );
    if (!confirmed) return;

    setBusyId(row.student_id);
    setError('');
    setMessage('');
    try {
      await placementsApi.confirmPlacement(row.placement_id);
      setMessage(`Placement confirmed for ${row.name}.`);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmAll() {
    if (awaitingCount === 0) return;
    const confirmed = window.confirm(
      `Confirm ${awaitingCount} placement${awaitingCount === 1 ? '' : 's'}? Students and supervisors will be notified, and the placements can no longer be changed.`
    );
    if (!confirmed) return;

    setBulkBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await placementsApi.confirmAllPlacements();
      setMessage(`${res.data.confirmed} placement${res.data.confirmed === 1 ? '' : 's'} confirmed.`);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkBusy(false);
    }
  }

  const term = search.trim().toLowerCase();
  const visible = rows.filter((row) => {
    if (filter !== 'all' && row.status !== filter) return false;
    if (!term) return true;
    return (
      row.name.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      (row.company_name || '').toLowerCase().includes(term)
    );
  });

  const stats = [
    { label: 'Students', value: rows.length },
    { label: 'Unallocated', value: unallocatedCount },
    { label: 'Awaiting confirmation', value: awaitingCount },
    { label: 'Confirmed', value: confirmedCount },
  ];

  const actions = isHod ? (
    <button
      type="button"
      className="btn btn--primary"
      onClick={handleConfirmAll}
      disabled={bulkBusy || awaitingCount === 0}
    >
      {bulkBusy ? 'Confirming...' : `Confirm all awaiting (${awaitingCount})`}
    </button>
  ) : (
    <Link to="/admin/companies" className="btn btn--ghost">
      Manage companies
    </Link>
  );

  return (
    <PortalLayout
      eyebrow="Placements"
      title={isHod ? 'Confirm placements' : 'Allocate students'}
      actions={actions}
    >
      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-result__note">{message}</p>}
      {loading && <p className="admin-empty">Loading placements...</p>}

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
            <h2 className="admin-panel__title">Student placements</h2>
            <p className="admin-panel__hint">
              {isHod
                ? 'Review each allocation made by the Coordinator and confirm it. A confirmed placement is locked.'
                : 'Match each student to an organisation by programme and sector. The Head of Department confirms the allocation, and a confirmed placement is locked.'}
            </p>

            <div className="admin-form">
              <label className="inline-form__field">
                <span>Search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Student or organisation"
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
                      <th>Programme</th>
                      <th>Organisation</th>
                      <th>Status</th>
                      <th>{isHod ? 'Action' : 'Allocation'}</th>
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
                        <td data-label="Programme">{row.programme || '-'}</td>
                        <td data-label="Organisation">
                          {row.company_name ? (
                            <div>
                              <div style={{ fontWeight: 700 }}>{row.company_name}</div>
                              <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                                {row.industry_sector || 'No sector'}
                              </div>
                              {row.preference_note && (
                                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                                  Note: {row.preference_note}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td data-label="Status">
                          <span style={{ fontWeight: 700, color: STATUS_COLORS[row.status] }}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        <td data-label={isHod ? 'Action' : 'Allocation'} className={isHod ? undefined : 'data-table__full'}>
                          {isHod && row.status === 'allocated' && (
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => handleConfirm(row)}
                              disabled={busyId === row.student_id || bulkBusy}
                            >
                              {busyId === row.student_id ? 'Confirming...' : 'Confirm'}
                            </button>
                          )}
                          {isHod && row.status === 'confirmed' && (
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                              {new Date(row.confirmed_at).toLocaleDateString()}
                            </span>
                          )}
                          {isHod && row.status === 'unallocated' && (
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Not allocated yet</span>
                          )}
                          {!isHod && row.status !== 'confirmed' && (
                            <AllocationCell
                              key={`${row.student_id}-${row.company_id}-${row.status}-${row.preference_note}`}
                              row={row}
                              companies={companies}
                              saving={busyId === row.student_id}
                              onSave={handleAllocate}
                              onRemove={handleRemove}
                            />
                          )}
                          {!isHod && row.status === 'confirmed' && (
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                              Locked on {new Date(row.confirmed_at).toLocaleDateString()}
                            </span>
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