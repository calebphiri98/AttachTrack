import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './PortalLayout.css';
import NotificationBell from './NotificationBell';
import NetworkBanner from './NetworkBanner';
import ConfirmDialog from './ConfirmDialog';
import './offline.css';
import { useAuth } from '../../context/AuthContext';
import { useUnsyncedCount } from '../../offline/hooks';
import { triggerSync } from '../../offline/syncEngine';

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
const SYNC_LINK = { to: '/sync', label: 'Sync' };

function isActive(location, path) {
  return location.pathname === path || location.pathname.startsWith(`${path}/`);
}

export default function PortalLayout({ eyebrow, title, actions, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [syncingBeforeLogout, setSyncingBeforeLogout] = useState(false);
  const unsynced = useUnsyncedCount();
  const links = [...(NAV[user?.role] || []), SYNC_LINK, SETTINGS_LINK];

  function handleLogoutClick() {
    if (unsynced.total > 0) {
      setConfirmLogout(true);
      return;
    }
    logout();
  }

  async function handleSyncFirst() {
    setSyncingBeforeLogout(true);
    try {
      await triggerSync('logout');
    } finally {
      setSyncingBeforeLogout(false);
    }
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="portal-layout">
      <header className="portal-layout__topbar">
        <div className="portal-layout__topbar-inner">
          <div className="portal-layout__brand">
            <span className="portal-layout__mark">AT</span>
            <span className="portal-layout__wordmark">AttachTrack</span>
          </div>

          <nav
            id="portal-nav"
            className={`portal-layout__nav${menuOpen ? ' portal-layout__nav--open' : ''}`}
            aria-label="Main navigation"
          >
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`portal-layout__nav-link${isActive(location, link.to) ? ' portal-layout__nav-link--active' : ''}`}
              >
                {link.label}
                {link.to === '/sync' && unsynced.total > 0 && (
                  <span className="nav-badge">{unsynced.total}</span>
                )}
              </Link>
            ))}

            <div className="portal-layout__panel-account">
              <div className="portal-layout__panel-identity">
                <span className="portal-layout__panel-name">{user?.name}</span>
                <span className="portal-layout__panel-role">{ROLE_LABELS[user?.role]}</span>
              </div>
              <button className="portal-layout__logout" onClick={handleLogoutClick}>
                Log out
              </button>
            </div>
          </nav>

          <div className="portal-layout__account">
            <NotificationBell />
            <span className="portal-layout__role">{ROLE_LABELS[user?.role]}</span>
            <span className="portal-layout__name">{user?.name}</span>
            <button
              className="portal-layout__logout portal-layout__logout--desktop"
              onClick={handleLogoutClick}
            >
              Log out
            </button>
            <button
              type="button"
              className={`portal-layout__toggle${menuOpen ? ' portal-layout__toggle--open' : ''}`}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="portal-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="portal-layout__toggle-bar" />
              <span className="portal-layout__toggle-bar" />
              <span className="portal-layout__toggle-bar" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            className="portal-layout__backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </header>

      <NetworkBanner />

      {confirmLogout && (
        <ConfirmDialog
          title="Unsynced work on this device"
          confirmLabel="Log out anyway"
          extraLabel="Sync now"
          busy={syncingBeforeLogout}
          onExtra={handleSyncFirst}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => {
            setConfirmLogout(false);
            logout();
          }}
        >
          You have {unsynced.total} {unsynced.total === 1 ? 'item' : 'items'} that {unsynced.total === 1 ? 'has' : 'have'} not reached the server yet. If you log out, {unsynced.total === 1 ? 'it stays' : 'they stay'} on this device and will sync the next time you sign in here. Connect to the internet and choose Sync now to send {unsynced.total === 1 ? 'it' : 'them'} first.
        </ConfirmDialog>
      )}

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
