import './PortalLayout.css';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  student: 'Student',
  industry_supervisor: 'Industry Supervisor',
  university_supervisor: 'University Supervisor',
};

export default function PortalLayout({ eyebrow, title, actions, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="portal-layout">
      <header className="portal-layout__topbar">
        <div className="portal-layout__brand">
          <span className="portal-layout__mark">AT</span>
          <span className="portal-layout__wordmark">AttachTrack</span>
        </div>
        <div className="portal-layout__account">
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
