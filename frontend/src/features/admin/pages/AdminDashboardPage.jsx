import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import ExportButton from '../../../components/shared/ExportButton';
import * as adminApi from '../../../api/admin.api';
import * as reportsApi from '../../../api/reports.api';

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

  const [newAccount, setNewAccount] = useState({ name: '', email: '', role: 'industry_supervisor' });
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
      setNewAccount({ name: '', email: '', role: 'industry_supervisor' });
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <PortalLayout
      eyebrow="Coordinator dashboard"
      title="Admin overview"
      actions={<ExportButton onClick={handleExport}>Export cohort CSV</ExportButton>}
    >
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {loading && <p>Loading dashboard…</p>}

      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, padding: 20, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Create supervisor account</h2>
        <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
          <input
            value={newAccount.name}
            onChange={(e) => setNewAccount((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Full name"
            required
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}
          />
          <input
            value={newAccount.email}
            onChange={(e) => setNewAccount((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            type="email"
            required
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}
          />
          <select
            value={newAccount.role}
            onChange={(e) => setNewAccount((prev) => ({ ...prev, role: e.target.value }))}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}
          >
            <option value="industry_supervisor">Industry Supervisor</option>
            <option value="university_supervisor">University Supervisor</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            style={{
              background: 'var(--stamp)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            {creating ? 'Creating…' : 'Create account'}
          </button>
        </form>

        {createError && <p style={{ color: 'var(--error)', marginTop: 12 }}>{createError}</p>}

        {createdResult && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid var(--line)' }}>
            <p style={{ margin: '4px 0' }}>Account created for {createdResult.user.email}</p>
            <p style={{ margin: '4px 0' }}>
              Temporary password: <strong>{createdResult.tempPassword}</strong>
            </p>
            <p style={{ margin: '4px 0', color: createdResult.emailSent ? 'var(--muted)' : 'var(--error)' }}>
              {createdResult.emailSent
                ? 'Credentials email sent.'
                : 'Credentials email failed to send — share the password above manually.'}
            </p>
          </div>
        )}
      </div>

      {dashboard && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, padding: 16 }}>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>Students</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{dashboard.summary.totalStudents}</div>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, padding: 16 }}>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>Linked</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{dashboard.summary.linkedStudents}</div>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, padding: 16 }}>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>With industry supervisors</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{dashboard.summary.withIndustry}</div>
            </div>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, padding: 16 }}>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>Average grade</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{dashboard.summary.averageGrade || 0}</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--panel)', borderRadius: 16 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                  <th style={{ padding: 12 }}>Student</th>
                  <th style={{ padding: 12 }}>Email</th>
                  <th style={{ padding: 12 }}>Industry</th>
                  <th style={{ padding: 12 }}>University</th>
                  <th style={{ padding: 12 }}>Grade</th>
                  <th style={{ padding: 12 }}>Assignments</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.students.map((student) => (
                  <tr key={student.id} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{student.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{student.link_status}</div>
                    </td>
                    <td style={{ padding: 12 }}>{student.email}</td>
                    <td style={{ padding: 12 }}>{student.industry_company_name || student.industry_supervisor_id || 'Unassigned'}</td>
                    <td style={{ padding: 12 }}>{student.university_department || student.university_supervisor_id || 'Unassigned'}</td>
                    <td style={{ padding: 12 }}>{student.current_grade || '—'}</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          value={assignments[student.id]?.industrySupervisorId ?? student.industry_supervisor_id ?? ''}
                          onChange={(e) =>
                            setAssignments((prev) => ({
                              ...prev,
                              [student.id]: { ...prev[student.id], industrySupervisorId: e.target.value },
                            }))
                          }
                          placeholder="Industry supervisor ID"
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}
                        />
                        <input
                          value={assignments[student.id]?.universitySupervisorId ?? student.university_supervisor_id ?? ''}
                          onChange={(e) =>
                            setAssignments((prev) => ({
                              ...prev,
                              [student.id]: { ...prev[student.id], universitySupervisorId: e.target.value },
                            }))
                          }
                          placeholder="University supervisor ID"
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAssign(student.id)}
                          disabled={savingId === student.id}
                          style={{
                            background: 'var(--stamp)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '8px 12px',
                            cursor: 'pointer',
                          }}
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
        </>
      )}
    </PortalLayout>
  );
}
