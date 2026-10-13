import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as adminApi from '../../../api/admin.api';
import * as placementsApi from '../../../api/placements.api';
import '../../../styles/portalSections.css';
import '../../admin/pages/AdminDashboardPage.css';

export default function HodDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [awaiting, setAwaiting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getAdminDashboard()
      .then((res) => setDashboard(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    placementsApi
      .getPlacementOverview()
      .then((res) => setAwaiting(res.data.filter((row) => row.status === 'allocated').length))
      .catch(() => setAwaiting(null));
  }, []);

  const stats = dashboard
    ? [
        { label: 'Students', value: dashboard.summary.totalStudents },
        { label: 'Linked', value: dashboard.summary.linkedStudents },
        { label: 'With industry supervisors', value: dashboard.summary.withIndustry },
        { label: 'With university supervisors', value: dashboard.summary.withUniversity },
      ]
    : [];

  return (
    <PortalLayout eyebrow="Head of Department" title="Department overview">
      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-empty">Loading dashboard...</p>}

      {awaiting !== null && (
        <section className="admin-panel">
          <h2 className="admin-panel__title">Placements awaiting your confirmation</h2>
          <p className="admin-panel__hint">
            {awaiting === 0
              ? 'No placements are waiting for confirmation.'
              : `${awaiting} allocation${awaiting === 1 ? ' is' : 's are'} waiting for you to confirm.`}
          </p>
          <Link to="/placements" className="btn btn--primary">
            {awaiting === 0 ? 'View placements' : `Review placements (${awaiting})`}
          </Link>
        </section>
      )}

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
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Industry</th>
                    <th>University</th>
                    <th>Grade</th>
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
                      <td data-label="Industry">
                        {student.industry_supervisor_name || (student.industry_supervisor_id ? 'Assigned' : 'Unassigned')}
                      </td>
                      <td data-label="University">
                        {student.university_supervisor_name || (student.university_supervisor_id ? 'Assigned' : 'Unassigned')}
                      </td>
                      <td data-label="Grade">{student.current_grade || 'Not graded'}</td>
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