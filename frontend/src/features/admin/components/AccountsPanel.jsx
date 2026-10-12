import { useEffect, useState } from 'react';
import * as adminApi from '../../../api/admin.api';
import { useAuth } from '../../../context/AuthContext';

const ROLE_LABELS = {
  student: 'Student',
  industry_supervisor: 'Industry Supervisor',
  university_supervisor: 'University Supervisor',
  hod: 'Head of Department',
  admin: 'Coordinator',
};

const ROLE_FILTERS = [
  { value: 'all', label: 'All roles' },
  { value: 'student', label: 'Students' },
  { value: 'industry_supervisor', label: 'Industry Supervisors' },
  { value: 'university_supervisor', label: 'University Supervisors' },
  { value: 'hod', label: 'Head of Department' },
  { value: 'admin', label: 'Coordinators' },
];

export default function AccountsPanel({ refreshKey }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function loadUsers() {
    try {
      const res = await adminApi.listUsers();
      setUsers(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [refreshKey]);

  async function handleToggle(target) {
    const nextActive = !target.is_active;
    if (
      !nextActive &&
      !window.confirm(`Deactivate ${target.name}? They will no longer be able to log in.`)
    ) {
      return;
    }

    setBusyId(target.id);
    setError('');
    try {
      const res = await adminApi.setUserActive(target.id, nextActive);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, ...res.data } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const term = search.trim().toLowerCase();
  const visible = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!term) return true;
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  return (
    <section className="admin-panel">
      <h2 className="admin-panel__title">Accounts</h2>
      <p className="admin-panel__hint">
        Deactivated accounts cannot log in. Their records are kept.
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
          <span>Role</span>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            {ROLE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-empty">Loading accounts...</p>}
      {!loading && visible.length === 0 && <p className="admin-empty">No accounts match.</p>}

      {visible.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((account) => {
                const isSelf = account.id === user?.id;
                return (
                  <tr key={account.id}>
                    <td data-label="Name">{account.name}</td>
                    <td data-label="Email">{account.email}</td>
                    <td data-label="Role">{ROLE_LABELS[account.role] || account.role}</td>
                    <td data-label="Status">
                      <span
                        style={{
                          fontWeight: 700,
                          color: account.is_active ? 'var(--stamp)' : 'var(--error)',
                        }}
                      >
                        {account.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td data-label="Action">
                      <button
                        type="button"
                        className={account.is_active ? 'btn' : 'btn btn--primary'}
                        style={account.is_active ? { color: 'var(--error)' } : undefined}
                        onClick={() => handleToggle(account)}
                        disabled={busyId === account.id || isSelf}
                        title={isSelf ? 'You cannot deactivate your own account' : undefined}
                      >
                        {busyId === account.id
                          ? 'Saving...'
                          : account.is_active
                            ? 'Deactivate'
                            : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}