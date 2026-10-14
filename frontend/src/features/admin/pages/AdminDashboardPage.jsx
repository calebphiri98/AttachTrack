import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import ExportButton from '../../../components/shared/ExportButton';
import AccountsPanel from '../components/AccountsPanel';
import AssignmentCell from '../components/AssignmentCell';
import * as adminApi from '../../../api/admin.api';
import * as reportsApi from '../../../api/reports.api';
import '../../../styles/portalSections.css';
import './AdminDashboardPage.css';

const EMPTY_ACCOUNT = { name: '', email: '', role: 'industry_supervisor' };
const EMPTY_SUPERVISORS = { industry: [], university: [] };

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
  const [supervisors, setSupervisors] = useState(EMPTY_SUPERVISORS);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  const [newAccount, setNewAccount] = useState(EMPTY_ACCOUNT);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [accountsVersion, setAccountsVersion] = useState(0);

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

  async function loadSupervisors() {
    try {
      const res = await adminApi.listSupervisors();
      setSupervisors(res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadSupervisors();
  }, [accountsVersion]);

  async function handleExport() {
    try {
      const csv = await reportsApi.exportCohortReport();
      downloadCsv(csv, 'cohort-report.csv');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAssign(studentId, payload) {
    setSavingId(studentId);
    setError('');
    try {
      await adminApi.assignStudentSupervisors(studentId, payload);
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
      setAccountsVersion((version) => version + 1);
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
      {loading && <p className="admin-empty">Loading dashboard...</p>}

      <section className="admin-panel">
        <h2 className="admin-panel__title">Create account</h2>
        <p className="admin-panel__hint">
          The new user receives a temporary password by email and can change it any time.
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
              <option value="hod">Head of Department</option>
            </select>
          </label>
          <button type="submit" className="btn btn--primary" disabled={creating}>
            {creating ? 'Creating...' : 'Create account'}
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

      <AccountsPanel refreshKey={accountsVersion} />

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
            <div className="data-table-wrap admin-table-wrap">
              <table className="data-table data-table--stack admin-table admin-table--students">
                <thead>
                  <tr>
                    <th>Student</th>
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
                        <div className="admin-person">
                          <div className="admin-person__name">
                            {student.name}
                            <span
                              className={`admin-pill ${student.link_status === 'linked' ? 'admin-pill--ok' : 'admin-pill--neutral'}`}
                            >
                              {student.link_status}
                            </span>
                          </div>
                          <div className="admin-person__sub">{student.email}</div>
                        </div>
                      </td>
                      <td data-label="Industry">
                        {student.industry_supervisor_id ? (
                          <div className="admin-person">
                            <div className="admin-person__name">{student.industry_supervisor_name}</div>
                            <div className="admin-person__sub">
                              {student.industry_company_name || 'No company'}
                            </div>
                          </div>
                        ) : (
                          <span className="admin-unassigned">Unassigned</span>
                        )}
                      </td>
                      <td data-label="University">
                        {student.university_supervisor_id ? (
                          <div className="admin-person">
                            <div className="admin-person__name">{student.university_supervisor_name}</div>
                            <div className="admin-person__sub">
                              {student.university_department || 'No department'}
                            </div>
                          </div>
                        ) : (
                          <span className="admin-unassigned">Unassigned</span>
                        )}
                      </td>
                      <td data-label="Grade">
                        {student.current_grade ? (
                          <span className="admin-grade">{student.current_grade}</span>
                        ) : (
                          <span className="admin-unassigned">Not graded</span>
                        )}
                      </td>
                      <td className="data-table__full" data-label="Assignments">
                        <AssignmentCell
                          key={`${student.id}-${student.industry_supervisor_id}-${student.university_supervisor_id}`}
                          student={student}
                          industrySupervisors={supervisors.industry}
                          universitySupervisors={supervisors.university}
                          saving={savingId === student.id}
                          onSave={handleAssign}
                        />
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