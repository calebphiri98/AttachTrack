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
            <div className="data-table-wrap admin-table-wrap">
              <table className="data-table data-table--stack admin-table admin-table--hod">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Industry</th>
                    <th>University</th>
                    <th>Grade</th>
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