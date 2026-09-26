import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getMyStudentProfile } from '../../../api/students.api';
import './DashboardPlaceholder.css';

const ROLE_LABELS = {
  student: 'Student',
  industry_supervisor: 'Industry Supervisor',
  university_supervisor: 'University Supervisor',
};

export default function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(user?.role === 'student');

  useEffect(() => {
    if (user?.role !== 'student') return;
    getMyStudentProfile()
      .then((res) => setStudentProfile(res.data))
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [user]);

  if (user?.role === 'industry_supervisor') {
    return <Navigate to="/industry/students" replace />;
  }

  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (user?.role === 'university_supervisor') {
    return <Navigate to="/university/students" replace />;
  }

  return (
    <div className="dashboard-placeholder">
      <header className="dashboard-placeholder__header">
        <div>
          <span className="dashboard-placeholder__eyebrow">
            {ROLE_LABELS[user?.role] || 'Account'}
          </span>
          <h1 className="dashboard-placeholder__title">Welcome, {user?.name}</h1>
        </div>
        <button className="dashboard-placeholder__logout" onClick={logout}>
          Log out
        </button>
      </header>

      {user?.role === 'student' && (
        <div className="dashboard-placeholder__card">
          {loadingProfile ? (
            <p>Loading your status…</p>
          ) : studentProfile ? (
            <>
              <span
                className={`dashboard-placeholder__status dashboard-placeholder__status--${studentProfile.link_status}`}
              >
                {studentProfile.link_status === 'linked' ? 'Linked' : 'Unlinked'}
              </span>
              {studentProfile.message && (
                <p className="dashboard-placeholder__message">{studentProfile.message}</p>
              )}
            </>
          ) : (
            <p>Couldn't load your profile right now.</p>
          )}
        </div>
      )}

      <p className="dashboard-placeholder__note">
        Auth is fully wired up. The rest of this dashboard — submissions, attendance,
        feedback, grades, messaging — is built out next.
      </p>
    </div>
  );
}