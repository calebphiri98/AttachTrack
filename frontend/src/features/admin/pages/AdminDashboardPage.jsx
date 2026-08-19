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

  return (
    <PortalLayout
      eyebrow="Coordinator dashboard"
      title="Admin overview"
      actions={<ExportButton onClick={handleExport}>Export cohort CSV</ExportButton>}
    >
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {loading && <p>Loading dashboard…</p>}

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
