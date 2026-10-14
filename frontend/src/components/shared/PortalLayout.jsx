import { Link, useLocation } from 'react-router-dom';
import './PortalLayout.css';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  student: 'Student',
  industry_supervisor: 'Industry Supervisor',
  university_supervisor: 'University Supervisor',
  admin: 'Coordinator',
  hod: 'Head of Department',
};

const NAV = {
  student: [
    { to: '/student/dashboard', label: 'Dashboard' },
    { to: '/student/messages', label: 'Messages' },
  ],
  industry_supervisor: [
    { to: '/industry/students', label: 'Dashboard' },
    { to: '/industry/attendance', label: 'Attendance' },
    { to: '/industry/assessments', label: 'Assessments' },
    { to: '/industry/messages', label: 'Messages' },
  ],
  university_supervisor: [
    { to: '/university/students', label: 'Dashboard' },
    { to: '/university/assessments', label: 'Assessments' },
    { to: '/university/messages', label: 'Messages' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/placements', label: 'Placements' },
    { to: '/assessments/forms', label: 'Assessment forms' },
    { to: '/results', label: 'Results' },
  ],
  hod: [
    { to: '/hod/dashboard', label: 'Dashboard' },
    { to: '/placements', label: 'Placements' },
    { to: '/results', label: 'Results' },
  ],
};

const SETTINGS_LINK = { to: '/settings/notifications', label: 'Settings' };

function isActive(location, path) {
  return location.pathname === path || location.pathname.startsWith(`${path}/`);
}

export default function PortalLayout({ eyebrow, title, actions, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = [...(NAV[user?.role] || []), SETTINGS_LINK];

  return (
    <div className="portal-layout">
      <header className="portal-layout__topbar">
        <div className="portal-layout__topbar-inner">
          <div className="portal-layout__brand">
            <span className="portal-layout__mark">AT</span>
            <span className="portal-layout__wordmark">AttachTrack</span>
          </div>

          <nav className="portal-layout__nav">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`portal-layout__nav-link${isActive(location, link.to) ? ' portal-layout__nav-link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="portal-layout__account">
            <NotificationBell />
            <span className="portal-layout__role">{ROLE_LABELS[user?.role]}</span>
            <span className="portal-layout__name">{user?.name}</span>
            <button className="portal-layout__logout" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="portal-layout__content">
        <div className="portal-layout__page-header">
          <div className="portal-layout__heading">
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