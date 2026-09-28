import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import ExportButton from '../../../components/shared/ExportButton';
import * as adminApi from '../../../api/admin.api';
import * as reportsApi from '../../../api/reports.api';
import '../../../styles/portalSections.css';
import './AdminDashboardPage.css';

const EMPTY_ACCOUNT = { name: '', email: '', role: 'industry_supervisor' };

function downloadCsv(text, filename) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [error, setError] = useState('');

  const [newAccount, setNewAccount] = useState(EMPTY_ACCOUNT);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);

  async function loadDashboard() {
    try {
      const res = await adminApi.getAdminDashboard();
      setDashboard(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleExport() {
    try {
      const csv = await reportsApi.exportCohortReport();
      downloadCsv(csv, 'cohort-report.csv');
    } catch (err) {
      setError(err.message);
    }
  }

  function updateAssignment(studentId, field, value) {
    setAssignments((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  }

  async function handleAssign(studentId) {
    const assignment = assignments[studentId] || {};
    if (!assignment.industrySupervisorId && !assignment.universitySupervisorId) return;
    setSavingId(studentId);
    try {
      await adminApi.assignStudentSupervisors(studentId, {
        industrySupervisorId: assignment.industrySupervisorId || null,
        universitySupervisorId: assignment.universitySupervisorId || null,
      });
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    setCreateError('');
    setCreatedResult(null);
    if (!newAccount.name.trim() || !newAccount.email.trim()) return;
    setCreating(true);
    try {
      const res = await adminApi.createAccount(newAccount);
      setCreatedResult(res.data);
      setNewAccount(EMPTY_ACCOUNT);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const stats = dashboard
    ? [
        { label: 'Students', value: dashboard.summary.totalStudents },
        { label: 'Linked', value: dashboard.summary.linkedStudents },
        { label: 'With industry supervisors', value: dashboard.summary.withIndustry },
        { label: 'Average grade', value: dashboard.summary.averageGrade || 0 },
      ]
    : [];

  return (
    <PortalLayout
      eyebrow="Coordinator dashboard"
      title="Admin overview"
      actions={<ExportButton onClick={handleExport}>Export cohort CSV</ExportButton>}
    >
      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-empty">Loading dashboard…</p>}

      <section className="admin-panel">
        <h2 className="admin-panel__title">Create supervisor account</h2>
        <p className="admin-panel__hint">
          The new supervisor receives a temporary password by email and can change it any time.
        </p>

        <form onSubmit={handleCreateAccount} className="admin-form">
          <label className="inline-form__field">
            <span>Full name</span>
            <input
              value={newAccount.name}
              onChange={(e) => setNewAccount((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label className="inline-form__field">
            <span>Email</span>
            <input
              type="email"
              value={newAccount.email}
              onChange={(e) => setNewAccount((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>
          <label className="inline-form__field">
            <span>Role</span>
            <select
              value={newAccount.role}
              onChange={(e) => setNewAccount((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="industry_supervisor">Industry Supervisor</option>
              <option value="university_supervisor">University Supervisor</option>
            </select>
          </label>
          <button type="submit" className="btn btn--primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create account'}
          </button>
        </form>

        {createError && <p className="admin-error">{createError}</p>}

        {createdResult && (
          <div className="admin-result">
            <p>
              Account created for <strong>{createdResult.user.email}</strong>
            </p>
            <p>
              Temporary password: <span className="admin-result__password">{createdResult.tempPassword}</span>
            </p>
            <p className={`admin-result__note${createdResult.emailSent ? '' : ' admin-result__note--warn'}`}>
              {createdResult.emailSent
                ? 'Credentials email sent.'
                : 'Credentials email failed to send. Share the password above manually.'}
            </p>
          </div>
        )}
      </section>

      {dashboard && (
        <>
          <div className="stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <div className="stat-card__label">{stat.label}</div>
                <div className="stat-card__value">{stat.value}</div>
              </div>
            ))}
          </div>

          {dashboard.students.length === 0 ? (
            <p className="admin-empty">No students registered yet.</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Industry</th>
                    <th>University</th>
                    <th>Grade</th>
                    <th>Assignments</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.students.map((student) => (
                    <tr key={student.id}>
                      <td data-label="Student">
                        <div>
                          <div style={{ fontWeight: 700 }}>{student.name}</div>
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{student.link_status}</div>
                        </div>
                      </td>
                      <td data-label="Email">{student.email}</td>
                      <td
                        data-label="Industry"
                        className={!student.industry_company_name && student.industry_supervisor_id ? 'data-table__id' : ''}
                      >
                        {student.industry_company_name || student.industry_supervisor_id || 'Unassigned'}
                      </td>
                      <td
                        data-label="University"
                        className={!student.university_department && student.university_supervisor_id ? 'data-table__id' : ''}
                      >
                        {student.university_department || student.university_supervisor_id || 'Unassigned'}
                      </td>
                      <td data-label="Grade">{student.current_grade || 'Not graded'}</td>
                      <td className="data-table__full">
                        <div className="admin-assign">
                          <input
                            aria-label="Industry supervisor ID"
                            placeholder="Industry supervisor ID"
                            value={assignments[student.id]?.industrySupervisorId ?? student.industry_supervisor_id ?? ''}
                            onChange={(e) => updateAssignment(student.id, 'industrySupervisorId', e.target.value)}
                          />
                          <input
                            aria-label="University supervisor ID"
                            placeholder="University supervisor ID"
                            value={assignments[student.id]?.universitySupervisorId ?? student.university_supervisor_id ?? ''}
                            onChange={(e) => updateAssignment(student.id, 'universitySupervisorId', e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn--primary btn--block"
                            onClick={() => handleAssign(student.id)}
                            disabled={savingId === student.id}
                          >
                            {savingId === student.id ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}