import { Link, useLocation } from 'react-router-dom';
import './PortalLayout.css';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  student: 'Student',
  industry_supervisor: 'Industry Supervisor',
  university_supervisor: 'University Supervisor',
  admin: 'Coordinator',
  hod: 'Head of Department',
};

const DASHBOARD_PATH = {
  student: '/student/dashboard',
  industry_supervisor: '/industry/students',
  university_supervisor: '/university/students',
  admin: '/admin/dashboard',
  hod: '/hod/dashboard',
};

const MESSAGES_PATH = {
  student: '/student/messages',
  industry_supervisor: '/industry/messages',
  university_supervisor: '/university/messages',
};

const RESULTS_PATH = {
  admin: '/results',
  hod: '/results',
};

function navClass(location, path) {
  return `portal-layout__nav-link${location.pathname === path ? ' portal-layout__nav-link--active' : ''}`;
}

export default function PortalLayout({ eyebrow, title, actions, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="portal-layout">
      <header className="portal-layout__topbar">
        <div className="portal-layout__brand">
          <span className="portal-layout__mark">AT</span>
          <span className="portal-layout__wordmark">AttachTrack</span>
        </div>
        <div className="portal-layout__account">
          {DASHBOARD_PATH[user?.role] && (
            <Link to={DASHBOARD_PATH[user.role]} className={navClass(location, DASHBOARD_PATH[user.role])}>
              Dashboard
            </Link>
          )}
          {RESULTS_PATH[user?.role] && (
            <Link to={RESULTS_PATH[user.role]} className={navClass(location, RESULTS_PATH[user.role])}>
              Results
            </Link>
          )}
          {MESSAGES_PATH[user?.role] && (
            <Link to={MESSAGES_PATH[user.role]} className={navClass(location, MESSAGES_PATH[user.role])}>
              Messages
            </Link>
          )}
          <span className="portal-layout__role">{ROLE_LABELS[user?.role]}</span>
          <span className="portal-layout__name">{user?.name}</span>
          <button className="portal-layout__logout" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="portal-layout__content">
        <div className="portal-layout__page-header">
          <div>
            {eyebrow && <span className="portal-layout__eyebrow">{eyebrow}</span>}
            <h1 className="portal-layout__title">{title}</h1>
          </div>
          {actions && <div className="portal-layout__actions">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}